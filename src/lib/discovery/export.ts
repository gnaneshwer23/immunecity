/**
 * Discovery dossier export stubs (Phase 7).
 * Exports only already-known gap fields — never fabricates PMIDs or metrics.
 * Quotas / plan gates are enforced by callers via entitlements.assertQuotaAllows.
 */
import type { ResearchGapCandidate } from "@/lib/discovery/types";
import { ENTITLEMENT_ACCESS } from "@/lib/discovery/entitlements";

export const EXPORT_POLICY = {
  paymentActivation: ENTITLEMENT_ACCESS.paymentActivation,
  fabricatesPmids: false as const,
  inventsMetrics: false as const,
  formats: ["markdown", "json"] as const,
  note: "Export is a Researcher Pro+ stub. Contents mirror the dossier already shown — not a novelty claim.",
};

export type DossierExportFormat = (typeof EXPORT_POLICY.formats)[number];

export type DossierExportInput = {
  gap: Pick<
    ResearchGapCandidate,
    | "gapKey"
    | "title"
    | "summary"
    | "status"
    | "whyItMatters"
    | "searchScope"
    | "detectionSource"
    | "coverageLabel"
    | "pilot"
  >;
  persistedStatus?: string | null;
  format: DossierExportFormat;
};

export type DossierExportResult = {
  format: DossierExportFormat;
  filename: string;
  body: string;
  paymentActivation: false;
  fabricatesPmids: false;
  note: string;
};

export function planDossierExport(input: DossierExportInput): DossierExportResult {
  const status = input.persistedStatus ?? input.gap.status;
  const safeName = input.gap.gapKey.replace(/[^a-zA-Z0-9._-]+/g, "_");
  if (input.format === "json") {
    const payload = {
      gapKey: input.gap.gapKey,
      title: input.gap.title,
      summary: input.gap.summary,
      status,
      whyItMatters: input.gap.whyItMatters,
      searchScope: input.gap.searchScope,
      detectionSource: input.gap.detectionSource,
      coverageLabel: input.gap.coverageLabel,
      pilot: input.gap.pilot,
      paymentActivation: false,
      note: EXPORT_POLICY.note,
    };
    return {
      format: "json",
      filename: `${safeName}.json`,
      body: JSON.stringify(payload, null, 2),
      paymentActivation: false,
      fabricatesPmids: false,
      note: EXPORT_POLICY.note,
    };
  }

  const lines = [
    `# ${input.gap.title}`,
    "",
    `Gap key: ${input.gap.gapKey}`,
    `Status: ${status}`,
    `Detection: ${input.gap.detectionSource}${input.gap.pilot ? ` (${input.gap.pilot})` : ""}`,
    input.gap.coverageLabel ? `Coverage label: ${input.gap.coverageLabel}` : null,
    "",
    "## Summary",
    input.gap.summary,
    "",
    "## Why it matters",
    input.gap.whyItMatters,
    "",
    "## Search scope",
    `- Corpus: ${input.gap.searchScope.corpus}`,
    `- Method: ${input.gap.searchScope.method}`,
    `- Date scope: ${input.gap.searchScope.dateScope}`,
    `- Note: ${input.gap.searchScope.note}`,
    "",
    `_${EXPORT_POLICY.note}_`,
  ].filter((line): line is string => line !== null);

  return {
    format: "markdown",
    filename: `${safeName}.md`,
    body: lines.join("\n"),
    paymentActivation: false,
    fabricatesPmids: false,
    note: EXPORT_POLICY.note,
  };
}
