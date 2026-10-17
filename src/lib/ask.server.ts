import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { and, eq, inArray } from "drizzle-orm";
import { createOpenAIDirectCall, createResponsesCall } from "@/lib/ai/responses.server.ts";
import {
  ASK_DISABLED_MESSAGE,
  MAX_QUESTION_CHARS,
  SYSTEM,
  attachProvisionalLiterature,
  isAskEmergencyDisabled,
  prepareAsk,
  rateLimited,
  validateAnswerCitations,
  type AskGrounding,
  type PrepareAskResult,
} from "@/lib/askGrounding";
import { EvidenceServiceError } from "@/lib/citations.functions";
import { getDb } from "@/lib/db.server";
import { evidenceRecords } from "@/lib/db/schema.server";
import type { CitationLike } from "@/lib/immune/evidenceStatus";
import { fetchProvisionalLiterature } from "@/lib/provisionalLit.server";

export type ReviewedEvidenceResult =
  | { ok: true; cites: CitationLike[] }
  | { ok: false; error: "unavailable"; message: string };

const EVIDENCE_OUTAGE_REPLY =
  "The evidence database is temporarily unavailable, so I cannot confirm reviewed sources for this answer. This is a service outage, not a finding that no evidence exists. Please try again shortly, or browse the graph and Methods & trust without Ask Immune.";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const LOVABLE_MODEL = "openai/gpt-6-astra";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

type AskProvider =
  | { kind: "lovable"; apiKey: string; model: string }
  | { kind: "openai"; apiKey: string; model: string };

function resolveAskProvider(env: NodeJS.ProcessEnv = process.env): AskProvider | null {
  const lovable = env["LOVABLE_API_KEY"]?.trim();
  if (lovable) return { kind: "lovable", apiKey: lovable, model: LOVABLE_MODEL };

  // Prefer OPENAI_API_KEY. OPEN_API_KEY kept temporarily for Vercel backward compat.
  const openai = env["OPENAI_API_KEY"]?.trim() || env["OPEN_API_KEY"]?.trim();
  if (openai) {
    const model = env["OPENAI_MODEL"]?.trim() || DEFAULT_OPENAI_MODEL;
    return { kind: "openai", apiKey: openai, model };
  }
  return null;
}

function textReply(text: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: "r" });
      writer.write({ type: "text-delta", id: "r", delta: text });
      writer.write({ type: "text-end", id: "r" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/** Approved Neon evidence for retrieved relationship IDs (claim-level context for Ask). */
export async function loadReviewedEvidenceForRels(relIds: string[]): Promise<ReviewedEvidenceResult> {
  if (!relIds.length) return { ok: true; cites: [] };
  try {
    const db = getDb();
    const rows = await db
      .select({
        evidenceId: evidenceRecords.evidenceId,
        sourceRef: evidenceRecords.sourceRef,
        pmid: evidenceRecords.pmid,
        doi: evidenceRecords.doi,
        relationshipId: evidenceRecords.relationshipId,
        claimSupport: evidenceRecords.claimSupport,
        reviewedAt: evidenceRecords.reviewedAt,
        curation: evidenceRecords.curation,
      })
      .from(evidenceRecords)
      .where(and(eq(evidenceRecords.curation, "approved"), inArray(evidenceRecords.relationshipId, relIds)));
    return {
      ok: true,
      cites: rows.map(
        (r): CitationLike => ({
          evidence_id: r.evidenceId,
          relationship_id: r.relationshipId ?? null,
          claim_support: r.claimSupport ?? "unassessed",
          reviewed_at: r.reviewedAt?.toISOString?.() ?? (r.reviewedAt as string | null) ?? null,
          curation: r.curation,
          pmid: r.pmid,
          doi: r.doi,
          label: r.pmid ? `PMID ${r.pmid}` : r.doi ? `DOI ${r.doi}` : (r.sourceRef ?? r.evidenceId),
          url: r.pmid
            ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`
            : r.doi
              ? `https://doi.org/${r.doi}`
              : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(r.sourceRef ?? "")}`,
        }),
      ),
    };
  } catch (err) {
    const message =
      err instanceof EvidenceServiceError
        ? err.message
        : "Evidence database query failed while loading reviewed relationship citations.";
    return { ok: false, error: "unavailable", message };
  }
}

const CITATION_REJECT =
  "I drafted an answer but it cited concepts, links or PMIDs outside the retrieved graph extract / reviewed evidence / provisional literature, so I'm not publishing it. Rephrase using named atlas concepts, or open the graph and Methods & trust.";

export type PrepareAskServerResult =
  | { ok: true; prepared: PrepareAskResult; grounding: AskGrounding; provisionalError?: string; provisionalSkipped?: string }
  | { ok: false; error: "evidence_unavailable"; message: string };

/**
 * Full server prepare: graph + Gate C approved cites + optional provisional lit.
 * Used by /api/ask and /api/ask/prepare so the UI can surface the same tiers.
 */
export async function prepareAskServer(
  question: string,
  rateKey = "anon",
): Promise<PrepareAskServerResult> {
  const preliminary = prepareAsk(question);
  if (!preliminary.callModel) {
    return { ok: true, prepared: preliminary, grounding: preliminary.grounding };
  }

  const evidence = await loadReviewedEvidenceForRels(preliminary.grounding.relIds);
  if (!evidence.ok) {
    return { ok: false, error: "evidence_unavailable", message: evidence.message };
  }

  let prepared = prepareAsk(question, evidence.cites);
  const lit = await fetchProvisionalLiterature({
    grounding: prepared.grounding,
    question,
    queryClass: prepared.queryClass,
    rateKey,
  });
  const grounding = attachProvisionalLiterature(prepared.grounding, lit.items);
  prepared = { ...prepared, grounding };
  return {
    ok: true,
    prepared,
    grounding,
    provisionalError: lit.error,
    provisionalSkipped: lit.skipped,
  };
}

export async function handleAsk(request: Request): Promise<Response> {
  if (isAskEmergencyDisabled()) {
    return Response.json({ error: ASK_DISABLED_MESSAGE }, { status: 503, headers: { "Retry-After": "300" } });
  }

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) {
    return Response.json({ error: "Too many questions in a short time. Please wait a minute." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  let messages: UIMessage[];
  try {
    const body = await request.json();
    messages = body.messages;
    if (!Array.isArray(messages)) throw new Error("bad body");
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  messages = messages.slice(-10);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  // Prefer AI SDK UIMessage `parts`; fall back to legacy `content` so curl/tests still work.
  const fromParts =
    lastUser?.parts?.filter((p) => p.type === "text").map((p) => ("text" in p ? String(p.text) : "")).join(" ") ?? "";
  const fromContent =
    typeof (lastUser as unknown as { content?: unknown } | undefined)?.content === "string"
      ? String((lastUser as unknown as { content: string }).content)
      : Array.isArray((lastUser as unknown as { content?: unknown } | undefined)?.content)
        ? ((lastUser as unknown as { content: Array<{ type?: string; text?: string }> }).content)
            .filter((p) => p?.type === "text" || typeof p?.text === "string")
            .map((p) => p.text ?? "")
            .join(" ")
        : "";
  const question = (fromParts || fromContent).trim();
  if (!question) {
    return Response.json({ error: "Missing question text." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json({ error: `Please keep questions under ${MAX_QUESTION_CHARS} characters.` }, { status: 400 });
  }

  // Abstentions (clinical, omics, unsupported) must work even when the model key is absent.
  const serverPrep = await prepareAskServer(question, ip);
  if (!serverPrep.ok) {
    return textReply(EVIDENCE_OUTAGE_REPLY);
  }
  const { prepared } = serverPrep;
  if (!prepared.callModel && prepared.replyText) {
    return textReply(prepared.replyText);
  }

  const provider = resolveAskProvider();
  if (!provider) {
    return Response.json(
      {
        error:
          "AI is not configured for this app yet. Safe abstentions still work; grounded model answers require LOVABLE_API_KEY (Lovable gateway) or OPENAI_API_KEY (OpenAI Responses API).",
      },
      { status: 503 },
    );
  }

  const system =
    SYSTEM +
    prepared.grounding.text +
    `\n\nRESPONSE_TRACE prompt=${prepared.grounding.trace.promptVersion} graph=${prepared.grounding.trace.graphVersion} class=${prepared.queryClass}`;
  const modelMessages = await convertToModelMessages(messages);

  // Buffer model text so we can enforce citation validation before returning to the client.
  let draft: string;
  try {
    if (provider.kind === "lovable") {
      const { result } = createResponsesCall(
        request,
        { baseURL: GATEWAY_URL, apiKey: provider.apiKey, model: provider.model },
        modelMessages,
        system,
      );
      draft = await result.text;
    } else {
      const { result } = createOpenAIDirectCall(
        request,
        { apiKey: provider.apiKey, model: provider.model },
        modelMessages,
        system,
      );
      draft = await result.text;
    }
  } catch {
    return Response.json({ error: "The model could not complete this answer. Please try again." }, { status: 502 });
  }

  const validation = validateAnswerCitations(draft, prepared.grounding);
  if (!validation.ok) {
    return textReply(CITATION_REJECT);
  }

  return textReply(draft);
}

/** Exported for unit tests — do not use from client code. */
export { resolveAskProvider };
