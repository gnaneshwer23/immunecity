import { createFileRoute } from "@tanstack/react-router";
import { MAX_QUESTION_CHARS, isAskEmergencyDisabled, ASK_DISABLED_MESSAGE } from "@/lib/askGrounding";
import { prepareAskServer } from "@/lib/ask.server";
import { askObservabilityPublic } from "@/lib/askObservability";
import { clientIp } from "@/lib/clientIp";

/** Lightweight grounding for Ask Immune UI (graph + Gate C + provisional lit). */
async function handlePrepare(request: Request): Promise<Response> {
  if (isAskEmergencyDisabled()) {
    return Response.json({ error: ASK_DISABLED_MESSAGE }, { status: 503 });
  }
  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!question) return Response.json({ error: "Missing question text." }, { status: 400 });
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json({ error: `Please keep questions under ${MAX_QUESTION_CHARS} characters.` }, { status: 400 });
  }

  const ip = clientIp(request.headers);
  const result = await prepareAskServer(question, ip);
  if (!result.ok) {
    return Response.json(
      {
        error: result.message,
        code: "evidence_unavailable",
        observability: result.observability ? askObservabilityPublic(result.observability) : null,
      },
      { status: 503 },
    );
  }

  const {
    grounding,
    prepared,
    provisionalError,
    provisionalSkipped,
    counterHarvestSkipped,
    counterHarvestError,
    researchTrace,
    researchTraceText,
    observability,
  } = result;
  return Response.json({
    queryClass: prepared.queryClass,
    callModel: prepared.callModel,
    replyText: prepared.replyText,
    grounding: {
      nodeIds: grounding.nodeIds,
      relIds: grounding.relIds,
      nodes: grounding.nodes.map((n) => ({ id: n.id, name: n.name, node_type: n.node_type, desc: n.desc, draft: n.draft })),
      links: grounding.links,
      chains: grounding.chains,
      queryClass: grounding.queryClass,
      trace: grounding.trace,
      coverage: grounding.coverage,
      counterEvidence: grounding.counterEvidence,
      counterEvidenceHarvest: grounding.counterEvidenceHarvest,
      provisionalLiterature: grounding.provisionalLiterature,
      text: grounding.text,
    },
    provisionalError: provisionalError ?? null,
    provisionalSkipped: provisionalSkipped ?? null,
    counterHarvestSkipped: counterHarvestSkipped ?? null,
    counterHarvestError: counterHarvestError ?? null,
    researchTrace: researchTrace ?? null,
    researchTraceText: researchTraceText ?? null,
    observability: askObservabilityPublic(observability),
  });
}

export const Route = createFileRoute("/api/ask/prepare")({
  server: { handlers: { POST: ({ request }) => handlePrepare(request) } },
});
