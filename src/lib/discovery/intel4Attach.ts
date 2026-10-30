/**
 * Attach Evidence Intel 4.0 panel data for gap dossiers.
 * Prefers latest Neon decision audit; falls back to offline five-dossier validation snapshot.
 * Never invents accuracy % or Gate C approvals.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTEL4_VERSION } from "@/lib/discovery/intel4";
import type { GapDossierView } from "@/lib/discovery/dossier";

export type Intel4DecisionRow = {
  decisionType: string;
  summary: string;
  provenance: Record<string, unknown>;
  createdAt: string;
  version?: string;
};

export type Intel4ScoutRow = {
  strategyId: string;
  idempotencyKey: string;
  worksCount: number;
  hitCountKnown: boolean;
  totalHits: number | null;
  scopeNote: string;
  createdAt: string;
};

type OfflineGap = {
  gapKey: string;
  intel4: {
    support: number;
    contradict: number;
    background: number;
    insufficient: number;
    abstained: number;
    demotedFromPriorSupport: number;
    identifierValidated: number;
  };
  route: {
    risk: "low" | "moderate" | "high";
    href: string;
    autoApprove: false;
    reason: string;
  };
  adjudicator: string;
  smeStillNeeded: boolean;
  opportunityEmit: boolean;
  opportunityReason: string;
};

type OfflineSnapshot = {
  intel4Version?: string;
  perGap?: OfflineGap[];
  honesty?: string;
};

let cachedOffline: Map<string, OfflineGap> | null = null;

function loadOfflineMap(): Map<string, OfflineGap> {
  if (cachedOffline) return cachedOffline;
  const map = new Map<string, OfflineGap>();
  try {
    const raw = readFileSync(
      resolve(process.cwd(), "docs/ISI_EVIDENCE_INTEL_4_VALIDATION.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as OfflineSnapshot;
    for (const g of parsed.perGap ?? []) {
      map.set(g.gapKey, g);
    }
  } catch {
    /* optional — dossier stays without offline attach */
  }
  cachedOffline = map;
  return map;
}

export function dossierIntel4Honesty(source: "db" | "offline_validation"): string {
  return source === "db"
    ? "Intel 4.0 from latest Neon decision audit — engineering screen only; accuracyVsGold=null until SME gold labels; never Gate C auto-approve."
    : "Intel 4.0 from offline five-dossier validation snapshot — engineering screen on sprint passages; accuracyVsGold=null; not clinical conclusions.";
}

/** Map offline validation row → dossier.intel4 panel. */
export function intel4PanelFromOffline(gap: OfflineGap): NonNullable<GapDossierView["intel4"]> {
  return {
    version: INTEL4_VERSION,
    claimSupport: gap.intel4.support,
    claimInsufficient: gap.intel4.insufficient,
    claimAbstained: gap.intel4.abstained,
    demotedFromPriorSupport: gap.intel4.demotedFromPriorSupport,
    routeRisk: gap.route.risk,
    routeHref: gap.route.href,
    adjudicatorUncertainty: gap.adjudicator,
    smeQueued: gap.smeStillNeeded || gap.route.risk === "high",
    accuracyVsGold: null,
    honesty: dossierIntel4Honesty("offline_validation"),
    source: "offline_validation",
    scoutSummary:
      "Scout reused bounded retrieval corpora for this deep dossier (offline validation; no unbounded scrape).",
    verifierSummary: `support=${gap.intel4.support} contradict=${gap.intel4.contradict} background=${gap.intel4.background} insufficient=${gap.intel4.insufficient} abstained=${gap.intel4.abstained} demotedFromPriorSupport=${gap.intel4.demotedFromPriorSupport} identifierValidated=${gap.intel4.identifierValidated}`,
    crossExamSummary: gap.adjudicator.slice(0, 400),
    routingSummary: gap.route.reason,
    opportunitySummary: gap.opportunityEmit
      ? gap.opportunityReason
      : "No opportunity emitted from verified assessment.",
    decisions: [
      {
        type: "verify",
        summary: `Verified counts support=${gap.intel4.support} abstained=${gap.intel4.abstained}`,
        createdAt: null,
      },
      {
        type: "cross_examine",
        summary: gap.adjudicator.slice(0, 240),
        createdAt: null,
      },
      {
        type: "route",
        summary: gap.route.reason.slice(0, 240),
        createdAt: null,
      },
    ],
  };
}

/** Prefer DB decision audit; fall back to offline snapshot for the five deep dossiers. */
export function attachIntel4Panel(input: {
  gapKey: string;
  decisions?: Intel4DecisionRow[];
  scout?: Intel4ScoutRow | null;
}): NonNullable<GapDossierView["intel4"]> | null {
  const decisions = input.decisions ?? [];
  if (decisions.length > 0) {
    const byType = (t: string) => decisions.find((d) => d.decisionType === t);
    const verify = byType("verify");
    const xexam = byType("cross_examine");
    const route = byType("route");
    const scoutDec = byType("scout");
    const emit = byType("gap_emit");
    const prov = (route?.provenance?.route ?? {}) as {
      risk?: "low" | "moderate" | "high";
      href?: string;
    };
    const counts = (verify?.provenance?.counts ?? {}) as {
      support?: number;
      insufficient?: number;
      abstained?: number;
      demotedFromPriorSupport?: number;
    };
    const version = decisions[0]?.version ?? INTEL4_VERSION;
    const risk = prov.risk ?? null;
    return {
      version,
      claimSupport: counts.support ?? 0,
      claimInsufficient: counts.insufficient ?? 0,
      claimAbstained: counts.abstained ?? 0,
      demotedFromPriorSupport: counts.demotedFromPriorSupport ?? 0,
      routeRisk: risk,
      routeHref: prov.href ?? (risk === "high" ? `/sme?gapKey=${encodeURIComponent(input.gapKey)}` : null),
      adjudicatorUncertainty: xexam?.summary ?? null,
      smeQueued: risk === "high",
      accuracyVsGold: null,
      honesty: dossierIntel4Honesty("db"),
      source: "db",
      scoutSummary: input.scout
        ? `Scout ${input.scout.strategyId}: works=${input.scout.worksCount}; hits=${
            input.scout.hitCountKnown ? String(input.scout.totalHits) : "unknown"
          }. ${input.scout.scopeNote}`
        : scoutDec?.summary ?? null,
      verifierSummary: verify?.summary ?? null,
      crossExamSummary: xexam?.summary ?? null,
      routingSummary: route?.summary ?? null,
      opportunitySummary: emit?.summary ?? null,
      decisions: decisions.slice(0, 12).map((d) => ({
        type: d.decisionType,
        summary: d.summary.slice(0, 280),
        createdAt: d.createdAt,
      })),
    };
  }

  const offline = loadOfflineMap().get(input.gapKey);
  if (offline) return intel4PanelFromOffline(offline);
  return null;
}

/** Test helper — clear offline cache between tests if needed. */
export function clearIntel4OfflineCache(): void {
  cachedOffline = null;
}
