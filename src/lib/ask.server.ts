import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { and, eq, inArray, ne } from "drizzle-orm";
import { createOpenAIDirectCall, createResponsesCall } from "@/lib/ai/responses.server.ts";
import {
  ASK_DISABLED_MESSAGE,
  MAX_QUESTION_CHARS,
  PROMPT_VERSION,
  SYSTEM,
  attachCounterEvidence,
  attachCounterEvidenceHarvest,
  attachProvisionalLiterature,
  attachReviewedCites,
  classifyAskQuery,
  isAskEmergencyDisabled,
  prepareAsk,
  validateAnswerCitations,
  type AskGrounding,
  type PrepareAskResult,
} from "@/lib/askGrounding";
import { logAskGate } from "@/lib/askEvaluation.server";
import { askRateLimited } from "@/lib/askRateLimit.server";
import {
  askResponseContractSystemLines,
  buildAskResponseContract,
} from "@/lib/askResponseContract";
import { clientIp } from "@/lib/clientIp";
import { EvidenceServiceError } from "@/lib/citations.functions";
import { getDb } from "@/lib/db.server";
import { evidenceRecords } from "@/lib/db/schema.server";
import { APPROVAL_ELIGIBLE_CHECK, isCounterEvidenceAssessment, isGateCSupportingEvidence } from "@/lib/immune/evidenceInvariants";
import type { CitationLike } from "@/lib/immune/evidenceStatus";
import { fetchCounterevidenceHarvest, fetchProvisionalLiterature } from "@/lib/provisionalLit.server";
import {
  askObservabilityPublic,
  createAskObservability,
  elapsedMs,
  withTiming,
  type AskObservability,
} from "@/lib/askObservability";
import {
  attachRetrievalToTrace,
  createInvestigatePlan,
  summariseTrace,
  withStepStatus,
  type ResearchRunTrace,
} from "@/lib/research/researchPlanner";

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

function rowToCitationLike(r: {
  evidenceId: string;
  sourceRef: string | null;
  pmid: string | null;
  doi: string | null;
  relationshipId: string | null;
  claimSupport: string | null;
  reviewedAt: Date | string | null;
  curation: string;
  notes?: string | null;
}): CitationLike {
  return {
    evidence_id: r.evidenceId,
    relationship_id: r.relationshipId ?? null,
    claim_support: r.claimSupport ?? "unassessed",
    reviewed_at: r.reviewedAt instanceof Date ? r.reviewedAt.toISOString() : (r.reviewedAt ?? null),
    curation: r.curation,
    pmid: r.pmid,
    doi: r.doi,
    notes: r.notes ?? null,
    claim_text: r.notes ?? null,
    label: r.pmid ? `PMID ${r.pmid}` : r.doi ? `DOI ${r.doi}` : (r.sourceRef ?? r.evidenceId),
    url: r.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`
      : r.doi
        ? `https://doi.org/${r.doi}`
        : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(r.sourceRef ?? "")}`,
  };
}

/**
 * Gate C supporting evidence only: approved + supports + verified/matched.
 * Fail-closed — never mixes contradicts/partial into the answer-support path.
 */
export async function loadReviewedEvidenceForRels(relIds: string[]): Promise<ReviewedEvidenceResult> {
  if (!relIds.length) return { ok: true, cites: [] };
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
        checkStatus: evidenceRecords.checkStatus,
        notes: evidenceRecords.notes,
      })
      .from(evidenceRecords)
      .where(
        and(
          eq(evidenceRecords.curation, "approved"),
          eq(evidenceRecords.claimSupport, "supports"),
          inArray(evidenceRecords.checkStatus, [...APPROVAL_ELIGIBLE_CHECK]),
          inArray(evidenceRecords.relationshipId, relIds),
        ),
      );
    return {
      ok: true,
      cites: rows
        .filter((r) =>
          isGateCSupportingEvidence({
            curation: r.curation,
            claimSupport: r.claimSupport,
            relationshipId: r.relationshipId,
            checkStatus: r.checkStatus,
          }),
        )
        .map(rowToCitationLike),
    };
  } catch (err) {
    const message =
      err instanceof EvidenceServiceError
        ? err.message
        : "Evidence database query failed while loading reviewed relationship citations.";
    return { ok: false, error: "unavailable", message };
  }
}

/**
 * Separate counterevidence path for retrieved relationships (contradicts / partial).
 * Empty Neon is an honest empty set, not an outage.
 */
export async function loadCounterEvidenceForRels(relIds: string[]): Promise<ReviewedEvidenceResult> {
  if (!relIds.length) return { ok: true, cites: [] };
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
        checkStatus: evidenceRecords.checkStatus,
      })
      .from(evidenceRecords)
      .where(
        and(
          inArray(evidenceRecords.claimSupport, ["contradicts", "partial"]),
          inArray(evidenceRecords.checkStatus, [...APPROVAL_ELIGIBLE_CHECK]),
          ne(evidenceRecords.curation, "rejected"),
          inArray(evidenceRecords.relationshipId, relIds),
        ),
      );
    return {
      ok: true,
      cites: rows
        .filter((r) =>
          isCounterEvidenceAssessment({
            curation: r.curation,
            claimSupport: r.claimSupport,
            relationshipId: r.relationshipId,
            checkStatus: r.checkStatus,
          }),
        )
        .map(rowToCitationLike),
    };
  } catch (err) {
    const message =
      err instanceof EvidenceServiceError
        ? err.message
        : "Evidence database query failed while loading counterevidence.";
    return { ok: false, error: "unavailable", message };
  }
}

const CITATION_REJECT =
  "I drafted an answer but citation checks failed (invented or unretrieved IDs, a claim of reviewed support the sources do not give, or provisional literature without an unreviewed label), so I'm not publishing it. Rephrase using named atlas concepts, or open the graph and Methods.";

export type PrepareAskServerResult =
  | {
      ok: true;
      prepared: PrepareAskResult;
      grounding: AskGrounding;
      provisionalError?: string;
      provisionalSkipped?: string;
      counterHarvestSkipped?: string;
      counterHarvestError?: string;
      /** Bounded planner scaffold for investigate / hypothesis classes (partial). */
      researchTrace?: ResearchRunTrace;
      researchTraceText?: string;
      observability: AskObservability;
    }
  | { ok: false; error: "evidence_unavailable"; message: string; observability?: AskObservability };

/**
 * Full server prepare: graph + Gate C approved cites + optional provisional lit.
 * Used by /api/ask and /api/ask/prepare so the UI can surface the same tiers.
 */
export async function prepareAskServer(
  question: string,
  rateKey = "anon",
): Promise<PrepareAskServerResult> {
  const t0 = Date.now();
  let obs = createAskObservability();
  const preliminary = prepareAsk(question);
  obs = withTiming(obs, "prepare", elapsedMs(t0));
  obs = {
    ...obs,
    queryClass: preliminary.queryClass,
    reviewedEvidenceCount: preliminary.grounding.coverage.reviewedEvidenceCount,
    counterEvidenceCount: preliminary.grounding.coverage.counterEvidenceCount,
    provisionalLiteratureCount: 0,
    counterHarvestCount: 0,
  };
  if (!preliminary.callModel) {
    obs = { ...obs, totalMs: elapsedMs(t0), costUsd: null, modelId: null };
    return { ok: true, prepared: preliminary, grounding: preliminary.grounding, observability: obs };
  }

  const tEv = Date.now();
  const [evidence, counter] = await Promise.all([
    loadReviewedEvidenceForRels(preliminary.grounding.relIds),
    loadCounterEvidenceForRels(preliminary.grounding.relIds),
  ]);
  obs = withTiming(obs, "evidence_load", elapsedMs(tEv));
  obs = withTiming(obs, "counter_load", elapsedMs(tEv));
  if (!evidence.ok) {
    obs = { ...obs, totalMs: elapsedMs(t0), errorCode: "evidence_unavailable", costUsd: null };
    return { ok: false, error: "evidence_unavailable", message: evidence.message, observability: obs };
  }
  // Counter path soft-fails to empty (honest empty state) so Gate C support still flows.
  const counterCites = counter.ok ? counter.cites : [];

  let prepared = prepareAsk(question, [...evidence.cites, ...counterCites]);
  let grounding = attachReviewedCites(prepared.grounding, evidence.cites);
  grounding = attachCounterEvidence(grounding, counterCites);
  const tLit = Date.now();
  const lit = await fetchProvisionalLiterature({
    grounding,
    question,
    queryClass: prepared.queryClass,
    rateKey,
  });
  obs = withTiming(obs, "provisional_lit", elapsedMs(tLit));
  grounding = attachProvisionalLiterature(grounding, lit.items);
  const tHarv = Date.now();
  const harvest = await fetchCounterevidenceHarvest({ grounding, question, rateKey });
  obs = withTiming(obs, "counter_harvest", elapsedMs(tHarv));
  grounding = attachCounterEvidenceHarvest(grounding, harvest.items);
  prepared = { ...prepared, grounding };
  obs = {
    ...obs,
    queryClass: prepared.queryClass,
    reviewedEvidenceCount: grounding.coverage.reviewedEvidenceCount,
    counterEvidenceCount: grounding.coverage.counterEvidenceCount,
    provisionalLiteratureCount: grounding.provisionalLiterature.length,
    counterHarvestCount: grounding.counterEvidenceHarvest.length,
    costUsd: null,
    modelId: null,
    totalMs: elapsedMs(t0),
  };

  let researchTrace: ResearchRunTrace | undefined;
  let researchTraceText: string | undefined;
  if (prepared.queryClass === "hypothesis_request" || prepared.queryClass === "comparison") {
    researchTrace = attachRetrievalToTrace(createInvestigatePlan(question), {
      nodeIds: grounding.nodeIds,
      relIds: grounding.relIds,
      reviewedEvidenceCount: grounding.coverage.reviewedEvidenceCount,
      counterEvidenceCount: grounding.coverage.counterEvidenceCount,
      queryClass: prepared.queryClass,
    });
    researchTrace = withStepStatus(researchTrace, "s5", "done", {
      neonCounterEvidenceCount: grounding.coverage.counterEvidenceCount,
      harvestCount: grounding.counterEvidenceHarvest.length,
      harvestSkipped: harvest.skipped ?? null,
      emptyHonest:
        grounding.coverage.counterEvidenceCount === 0 && grounding.counterEvidenceHarvest.length === 0,
    });
    researchTraceText = summariseTrace(researchTrace);
  }

  return {
    ok: true,
    prepared,
    grounding,
    provisionalError: lit.error,
    provisionalSkipped: lit.skipped,
    counterHarvestSkipped: harvest.skipped,
    counterHarvestError: harvest.error,
    researchTrace,
    researchTraceText,
    observability: obs,
  };
}

export async function handleAsk(request: Request): Promise<Response> {
  if (isAskEmergencyDisabled()) {
    return Response.json({ error: ASK_DISABLED_MESSAGE }, { status: 503, headers: { "Retry-After": "300" } });
  }

  const ip = clientIp(request.headers);
  const rate = await askRateLimited(ip);
  if (rate.limited) {
    return Response.json(
      { error: "Too many questions in a short time. Please wait a minute.", rateLimitBackend: rate.backend },
      { status: 429, headers: { "Retry-After": "60" } },
    );
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
  const personalHealth = classifyAskQuery(question) === "clinical_personal";
  const promptVersion = prepared.grounding.trace.promptVersion || PROMPT_VERSION;
  if (!prepared.callModel && prepared.replyText) {
    await logAskGate({
      callModel: false,
      abstentionReason: prepared.grounding.trace.abstentionReason,
      personalHealth,
      validation: null,
      promptVersion,
    });
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

  const responseContract = buildAskResponseContract(prepared.grounding, prepared.queryClass);
  const system =
    SYSTEM +
    prepared.grounding.text +
    (serverPrep.researchTraceText ? `\n\n${serverPrep.researchTraceText}` : "") +
    `\n\n${askResponseContractSystemLines(responseContract)}` +
    `\n\nRESPONSE_TRACE prompt=${promptVersion} graph=${prepared.grounding.trace.graphVersion} class=${prepared.queryClass}`;
  const modelMessages = await convertToModelMessages(messages);

  // Buffer model text so we can enforce citation validation before returning to the client.
  let draft: string;
  const tModel = Date.now();
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
    const failObs = withTiming(serverPrep.observability, "model", elapsedMs(tModel));
    console.info(
      "[ask.observability]",
      JSON.stringify(askObservabilityPublic({ ...failObs, errorCode: "model_failed", costUsd: null, modelId: provider.model })),
    );
    return Response.json({ error: "The model could not complete this answer. Please try again." }, { status: 502 });
  }

  const tVal = Date.now();
  const validation = validateAnswerCitations(draft, prepared.grounding);
  let obs = withTiming(serverPrep.observability, "model", elapsedMs(tModel));
  obs = withTiming(obs, "citation_validation", elapsedMs(tVal));
  obs = {
    ...obs,
    citationValidationOk: validation.ok,
    modelId: provider.model,
    // Cost unknown unless provider returns it — never invent.
    costUsd: null,
    totalMs: (obs.totalMs ?? 0) + elapsedMs(tModel) + elapsedMs(tVal),
  };
  // Structured log line for ops (no question text / no secrets).
  console.info("[ask.observability]", JSON.stringify(askObservabilityPublic(obs)));

  await logAskGate({
    callModel: true,
    abstentionReason: null,
    personalHealth,
    validation,
    promptVersion,
  });

  if (!validation.ok) {
    return textReply(validation.failReason ? `${CITATION_REJECT} (${validation.failReason})` : CITATION_REJECT);
  }

  return textReply(draft);
}

/** Exported for unit tests — do not use from client code. */
export { resolveAskProvider };
