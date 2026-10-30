/**
 * Phase 6 — Continuous monitoring workflow (deterministic MVP).
 * Detects new/changed ISI signals for followed gaps / profile interests.
 * Never auto-promotes reviewed_gap. Never fabricates PMIDs.
 */
import type { AdapterSearchResult } from "@/lib/discovery/adapters";
import type { ResearchGapCandidate, ResearchProfileDraft } from "@/lib/discovery/types";

export const MONITOR_POLICY = {
  autoScientificReview: false as const,
  autoReviewedGap: false as const,
  fabricatesPmids: false as const,
  emailAlerts: false as const,
  inAppAlertsFirst: true as const,
  failClosedWithoutLiveKeys: true as const,
  note: "Monitor updates are engineering change signals only — not automatic scientific review.",
} as const;

export type MonitorTarget = {
  gapKey: string;
  gapId?: string | null;
  title: string;
  subjectId: string | null;
  objectId: string | null;
  diseaseId: string | null;
  relationshipId: string | null;
  detectionSource: string;
  coverageLabel: string | null;
  status: string;
  followed: boolean;
  profileInterestMatch: boolean;
};

export type MonitorSignal = {
  gapKey: string;
  kind: "detection_change" | "adapter_coverage" | "interest_match" | "followed_update";
  fingerprint: string;
  summary: string;
  detail: Record<string, unknown>;
  /** Never implies scientific approval. */
  scientificReviewImplied: false;
};

export type MonitorAlertDraft = {
  userId: string;
  gapKey: string;
  gapId: string | null;
  dedupeKey: string;
  eventType: string;
  title: string;
  body: string;
  href: string;
};

export type MonitorRunPlan = {
  targets: MonitorTarget[];
  signals: MonitorSignal[];
  alerts: MonitorAlertDraft[];
  adapterQueries: Array<{ gapKey: string; query: string }>;
  reassessment: Array<{
    gapKey: string;
    action: "version_snapshot" | "change_event_only" | "noop";
    reason: string;
    /** Status stays candidate/coverage_insufficient — never auto reviewed_gap. */
    statusUnchangedPolicy: "never_auto_reviewed_gap";
  }>;
  autoApprove: false;
  scientificReviewImplied: false;
  note: string;
};

function stableHash(parts: string[]): string {
  // FNV-1a 32-bit — deterministic, no crypto dependency.
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function interestMatch(
  gap: Pick<ResearchGapCandidate, "diseaseId" | "subjectId" | "objectId" | "title" | "summary">,
  profile: ResearchProfileDraft | null | undefined,
): boolean {
  if (!profile) return false;
  const tokens = [
    ...profile.focusDiseases,
    ...profile.focusDomains,
    ...profile.modalities,
  ].map((t) => t.toLowerCase());
  if (profile.interests && typeof profile.interests === "object") {
    for (const v of Object.values(profile.interests)) {
      if (typeof v === "string" && v.trim()) tokens.push(v.trim().toLowerCase());
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item.trim()) tokens.push(item.trim().toLowerCase());
        }
      }
    }
  }
  const hay = [gap.diseaseId, gap.subjectId, gap.objectId, gap.title, gap.summary]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return tokens.some((t) => t.length >= 3 && hay.includes(t));
}

export function buildMonitorTargets(input: {
  gaps: readonly ResearchGapCandidate[];
  followedGapKeys: ReadonlySet<string>;
  profile: ResearchProfileDraft | null | undefined;
  gapIdByKey?: Record<string, string>;
}): MonitorTarget[] {
  return input.gaps.map((g) => {
    const followed = input.followedGapKeys.has(g.gapKey);
    const match = interestMatch(g, input.profile);
    return {
      gapKey: g.gapKey,
      gapId: input.gapIdByKey?.[g.gapKey] ?? null,
      title: g.title,
      subjectId: g.subjectId,
      objectId: g.objectId,
      diseaseId: g.diseaseId,
      relationshipId: g.relationshipId,
      detectionSource: g.detectionSource,
      coverageLabel: g.coverageLabel,
      status: g.status,
      followed,
      profileInterestMatch: match,
    };
  }).filter((t) => t.followed || t.profileInterestMatch);
}

export function adapterQueryForGap(gap: MonitorTarget): string {
  const bits = [gap.diseaseId, gap.subjectId, gap.objectId, gap.title.slice(0, 80)].filter(Boolean);
  return bits.join(" ");
}

/**
 * Compare prior detection fingerprints to current candidates.
 * fingerprint = hash of status|coverage|source|rel — idempotent across identical runs.
 */
export function detectMonitorSignals(input: {
  targets: readonly MonitorTarget[];
  /** Prior fingerprints keyed by gapKey from last successful monitor. */
  priorFingerprints?: Record<string, string>;
  adapterResults?: Record<string, AdapterSearchResult>;
}): MonitorSignal[] {
  const prior = input.priorFingerprints ?? {};
  const signals: MonitorSignal[] = [];

  for (const t of input.targets) {
    const fp = stableHash([
      t.gapKey,
      t.status,
      t.coverageLabel ?? "",
      t.detectionSource,
      t.relationshipId ?? "",
    ]);
    const prev = prior[t.gapKey];
    if (!prev) {
      signals.push({
        gapKey: t.gapKey,
        kind: t.followed ? "followed_update" : "interest_match",
        fingerprint: fp,
        summary: t.followed
          ? `Followed gap ${t.gapKey} entered the monitor window.`
          : `Gap ${t.gapKey} matches profile interests.`,
        detail: { status: t.status, coverageLabel: t.coverageLabel },
        scientificReviewImplied: false,
      });
    } else if (prev !== fp) {
      signals.push({
        gapKey: t.gapKey,
        kind: "detection_change",
        fingerprint: fp,
        summary: `Detection fingerprint changed for ${t.gapKey} (engineering signal only).`,
        detail: { previous: prev, next: fp, status: t.status },
        scientificReviewImplied: false,
      });
    }

    const adapter = input.adapterResults?.[t.gapKey];
    if (adapter?.attempted) {
      const adapterFp = stableHash([
        t.gapKey,
        "adapter",
        String(adapter.hitCount),
        adapter.scopeNote.slice(0, 120),
      ]);
      // Only emit when hitCount is a real number (never invent counts).
      if (adapter.hitCount !== null && adapter.hitCount !== undefined) {
        signals.push({
          gapKey: t.gapKey,
          kind: "adapter_coverage",
          fingerprint: adapterFp,
          summary: `Adapter reported hitCount=${adapter.hitCount} for ${t.gapKey} (not a scientific review).`,
          detail: {
            hitCount: adapter.hitCount,
            scopeNote: adapter.scopeNote,
            rateLimited: adapter.rateLimited ?? false,
          },
          scientificReviewImplied: false,
        });
      }
    }
  }

  return signals;
}

/** Build in-app alert drafts with stable dedupe keys (userId + fingerprint). */
export function planMonitorAlerts(input: {
  userId: string;
  targets: readonly MonitorTarget[];
  signals: readonly MonitorSignal[];
  /** Existing dedupe keys already delivered — skip these. */
  existingDedupeKeys?: ReadonlySet<string>;
}): MonitorAlertDraft[] {
  const byKey = new Map(input.targets.map((t) => [t.gapKey, t]));
  const existing = input.existingDedupeKeys ?? new Set<string>();
  const alerts: MonitorAlertDraft[] = [];

  for (const s of input.signals) {
    const t = byKey.get(s.gapKey);
    const dedupeKey = `${s.kind}:${s.fingerprint}`;
    if (existing.has(dedupeKey)) continue;
    alerts.push({
      userId: input.userId,
      gapKey: s.gapKey,
      gapId: t?.gapId ?? null,
      dedupeKey,
      eventType: s.kind,
      title: s.kind === "detection_change" ? "Gap signal updated" : "Discovery monitor notice",
      body: `${s.summary} ${MONITOR_POLICY.note}`,
      href: `/discovery/gaps/${encodeURIComponent(s.gapKey)}`,
    });
  }
  return alerts;
}

export function planReassessment(signals: readonly MonitorSignal[]): MonitorRunPlan["reassessment"] {
  const seen = new Set<string>();
  const out: MonitorRunPlan["reassessment"] = [];
  for (const s of signals) {
    if (seen.has(s.gapKey)) continue;
    seen.add(s.gapKey);
    if (s.kind === "detection_change" || s.kind === "adapter_coverage") {
      out.push({
        gapKey: s.gapKey,
        action: "version_snapshot",
        reason: `Monitor observed ${s.kind}; append version/change_event only — no auto scientific review.`,
        statusUnchangedPolicy: "never_auto_reviewed_gap",
      });
    } else {
      out.push({
        gapKey: s.gapKey,
        action: "change_event_only",
        reason: `Monitor noticed ${s.kind}; record change_event without status mutation.`,
        statusUnchangedPolicy: "never_auto_reviewed_gap",
      });
    }
  }
  return out;
}

/** Pure planner used by the cron script and unit tests. */
export function planMonitorRun(input: {
  userId: string;
  gaps: readonly ResearchGapCandidate[];
  followedGapKeys: ReadonlySet<string>;
  profile: ResearchProfileDraft | null | undefined;
  gapIdByKey?: Record<string, string>;
  priorFingerprints?: Record<string, string>;
  adapterResults?: Record<string, AdapterSearchResult>;
  existingDedupeKeys?: ReadonlySet<string>;
}): MonitorRunPlan {
  const targets = buildMonitorTargets({
    gaps: input.gaps,
    followedGapKeys: input.followedGapKeys,
    profile: input.profile,
    gapIdByKey: input.gapIdByKey,
  });
  const adapterQueries = targets.map((t) => ({
    gapKey: t.gapKey,
    query: adapterQueryForGap(t),
  }));
  const signals = detectMonitorSignals({
    targets,
    priorFingerprints: input.priorFingerprints,
    adapterResults: input.adapterResults,
  });
  const alerts = planMonitorAlerts({
    userId: input.userId,
    targets,
    signals,
    existingDedupeKeys: input.existingDedupeKeys,
  });
  return {
    targets,
    signals,
    alerts,
    adapterQueries,
    reassessment: planReassessment(signals),
    autoApprove: false,
    scientificReviewImplied: false,
    note: MONITOR_POLICY.note,
  };
}

/** Idempotent merge: second identical plan yields zero new alerts when prior dedupe applied. */
export function dedupeAlertKeys(alerts: readonly MonitorAlertDraft[]): string[] {
  return [...new Set(alerts.map((a) => a.dedupeKey))];
}
