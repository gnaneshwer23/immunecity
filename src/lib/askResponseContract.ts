/**
 * Structured Ask response contract (educational beta).
 * Used to label Gate C vs provisional vs abstention without claiming CDS or full evidence-grounding.
 * Streaming UX stays free-text; this schema documents / validates the metadata surface.
 */
import { z } from "zod";
import type { AskGrounding, AskQueryClass } from "@/lib/askGrounding";
import { PROMPT_VERSION } from "@/lib/askGrounding";

export const ASK_EVIDENCE_LABELS = ["gate_c", "provisional", "none", "abstained"] as const;
export type AskEvidenceLabel = (typeof ASK_EVIDENCE_LABELS)[number];

export const askResponseContractSchema = z.object({
  promptVersion: z.string().min(1),
  queryClass: z.string().min(1),
  retrievedConcepts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      draft: z.boolean().optional(),
    }),
  ),
  retrievedRelIds: z.array(z.string()),
  evidenceLabel: z.enum(ASK_EVIDENCE_LABELS),
  gateCReviewedCount: z.number().int().nonnegative(),
  provisionalCount: z.number().int().nonnegative(),
  counterEvidenceCount: z.number().int().nonnegative(),
  abstained: z.boolean(),
  abstentionReason: z.string().nullable(),
  honesty: z.literal("educational_beta_not_cds"),
});

export type AskResponseContract = z.infer<typeof askResponseContractSchema>;

/** Derive Gate C vs provisional vs abstention label from grounding (no invented cites). */
export function evidenceLabelFromGrounding(grounding: AskGrounding): AskEvidenceLabel {
  if (grounding.trace.abstained || !grounding.coverage.matched) return "abstained";
  if ((grounding.coverage.reviewedEvidenceCount ?? 0) > 0) return "gate_c";
  if ((grounding.coverage.provisionalLiteratureCount ?? grounding.provisionalLiterature?.length ?? 0) > 0) {
    return "provisional";
  }
  return "none";
}

/** Build the structured contract from prepared grounding (browser-safe). */
export function buildAskResponseContract(
  grounding: AskGrounding,
  queryClass?: AskQueryClass,
): AskResponseContract {
  const label = evidenceLabelFromGrounding(grounding);
  return askResponseContractSchema.parse({
    promptVersion: grounding.trace.promptVersion || PROMPT_VERSION,
    queryClass: queryClass ?? grounding.queryClass,
    retrievedConcepts: grounding.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      draft: n.draft || undefined,
    })),
    retrievedRelIds: grounding.relIds.slice(0, 24),
    evidenceLabel: label,
    gateCReviewedCount: grounding.coverage.reviewedEvidenceCount ?? 0,
    provisionalCount: grounding.coverage.provisionalLiteratureCount ?? grounding.provisionalLiterature?.length ?? 0,
    counterEvidenceCount: grounding.coverage.counterEvidenceCount ?? 0,
    abstained: Boolean(grounding.trace.abstained) || label === "abstained",
    abstentionReason: grounding.trace.abstentionReason,
    honesty: "educational_beta_not_cds",
  });
}

/** Short SYSTEM reminder lines for the model (appended near RESPONSE_TRACE). */
export function askResponseContractSystemLines(contract: AskResponseContract): string {
  const concepts =
    contract.retrievedConcepts.length === 0
      ? "none"
      : contract.retrievedConcepts.map((c) => `${c.name}(${c.id})`).join(", ");
  const abstain = contract.abstentionReason ? ` abstention_reason=${contract.abstentionReason}` : "";
  return [
    "RESPONSE_CONTRACT (structured metadata — keep free-text answer; honour these labels):",
    `- retrieved_concepts: ${concepts}`,
    `- evidence_label: ${contract.evidenceLabel} (gate_c = reviewed approved+supports only; provisional = unreviewed lit; none = graph teaching without reviewed cites; abstained = no model synthesis)`,
    `- gate_c_count=${contract.gateCReviewedCount} provisional_count=${contract.provisionalCount} counter_evidence_count=${contract.counterEvidenceCount}${abstain}`,
    "- Never upgrade provisional to Gate C. Empty counterevidence is an empty set, not agreement. Educational beta — not CDS.",
  ].join("\n");
}
