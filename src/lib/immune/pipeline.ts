/* Disease pipeline: curated therapies ordered by mechanism, plus live registry studies
   grouped by the graph target their intervention acts on. Browser-safe and pure, so the
   grouping is unit-tested without network. Mapping is conservative: an intervention
   joins a mechanism only via an exact drug name or brand alias; anything else is
   "Other mechanisms" — never guessed. */
import { KG, byId, type KGNode } from "@/lib/immune/engine";
import { conceptExtras } from "@/lib/immune/concepts";
import { translationalPath, type TranslationalRow } from "@/lib/immune/translational";

export interface RegistryStudy {
  nctId: string;
  title: string;
  phase: string | null;
  status: string;
  sponsor: string | null;
  url: string;
  interventions: string[];
}

export interface PipelineGroup {
  /** Graph target (mechanism); null for the "Other mechanisms" bucket. */
  target: KGNode | null;
  /** Curated therapies in the graph acting on this target for this disease. */
  curated: TranslationalRow[];
  /** Live studies whose intervention maps to a graph therapy acting on this target. */
  studies: (RegistryStudy & { matched: KGNode[] })[];
}

/** Broad classes or background treatments that would mis-group trials if matched by name. */
const NON_SPECIFIC = new Set(["I010", "I031", "I032"]);
/** Alias words that describe a mechanism or class rather than one drug. */
const GENERIC_ALIAS = /\b(anti|inhibitor|blockade|depletion|derivative|class|vaccine|allosteric|bite|car t)\b/;

export const normaliseTerm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Drug-name terms per curated intervention: INN name plus brand / INN aliases. */
export function therapyTerms(): { node: KGNode; terms: string[] }[] {
  return KG.nodes
    .filter((n) => n.node_type === "INTERVENTION" && !n.draft && !NON_SPECIFIC.has(n.id))
    .map((node) => {
      const terms = [node.name, ...conceptExtras(node).aliases]
        .map(normaliseTerm)
        .filter((t) => t.length >= 5 && !GENERIC_ALIAS.test(t));
      return { node, terms: [...new Set(terms)] };
    })
    .filter((x) => x.terms.length > 0);
}

/** Graph therapies named by a registry intervention string (whole-word match only). */
export function matchTherapies(intervention: string, index = therapyTerms()): KGNode[] {
  const hay = ` ${normaliseTerm(intervention)} `;
  return index.filter((x) => x.terms.some((t) => hay.includes(` ${t} `))).map((x) => x.node);
}

/** Primary mechanism for a therapy: the first target it acts on in the graph. */
function primaryTarget(row: TranslationalRow): KGNode | null {
  return row.targets[0]?.node ?? null;
}

/** Curated therapies for a disease grouped by mechanism, then live studies slotted into those groups. */
export function buildPipeline(diseaseId: string, studies: RegistryStudy[] = []): PipelineGroup[] {
  const rows = translationalPath(diseaseId);
  const groups = new Map<string, PipelineGroup>();
  const groupFor = (target: KGNode | null) => {
    const key = target?.id ?? "__other";
    if (!groups.has(key)) groups.set(key, { target, curated: [], studies: [] });
    return groups.get(key)!;
  };
  for (const r of rows) groupFor(primaryTarget(r)).curated.push(r);

  const index = therapyTerms();
  for (const s of studies) {
    const matched = [...new Map(s.interventions.flatMap((i) => matchTherapies(i, index)).map((n) => [n.id, n])).values()];
    const targets = new Map<string, KGNode | null>();
    for (const m of matched) {
      const t = translationalPath(m.id)[0];
      const target = t ? primaryTarget(t) : null;
      if (target) targets.set(target.id, target);
    }
    if (!targets.size) groupFor(null).studies.push({ ...s, matched });
    for (const target of targets.values()) groupFor(target).studies.push({ ...s, matched });
  }

  return [...groups.values()].sort((a, b) => {
    if (!a.target !== !b.target) return a.target ? -1 : 1; // "Other" last
    const weight = (g: PipelineGroup) => g.curated.length * 2 + g.studies.length;
    return weight(b) - weight(a) || (a.target?.name ?? "").localeCompare(b.target?.name ?? "");
  });
}

/** Diseases with at least one curated therapy — the pages worth publishing. */
export function pipelineDiseases(): { node: KGNode; therapies: number; trials: number }[] {
  return KG.nodes
    .filter((n) => n.node_type === "DISEASE" && !n.draft)
    .map((node) => {
      const rows = translationalPath(node.id);
      return { node, therapies: rows.length, trials: new Set(rows.flatMap((r) => r.trials.map((t) => t.id))).size };
    })
    .filter((d) => d.therapies > 0)
    .sort((a, b) => b.therapies - a.therapies || a.node.name.localeCompare(b.node.name));
}

export const isPipelineDisease = (id: string) => byId[id]?.node_type === "DISEASE" && !byId[id]?.draft && translationalPath(id).length > 0;
