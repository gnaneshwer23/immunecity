/**
 * Scientific Validation & Production Hardening Sprint (30 Oct 2026).
 * Run: bun test src/test/hardening-sprint.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isTrialIntelligenceEnabled } from "@/lib/trialIntelligenceFlag";
import {
  COLLECTION_ACCESS,
  actorOwnsCollection,
  collectionOwnershipSpec,
  planEvidenceCollection,
} from "@/lib/research/collections";
import {
  EVIDENCE_GAP_PROVENANCE_NOTE,
  evidenceGapLabelText,
  evidenceGapLabelDescription,
} from "@/lib/research/evidenceGap";
import { prepareAsk, validateAnswerCitations } from "@/lib/askGrounding";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

describe("P0 collections ownership scoping", () => {
  it("defines owner-only access with no admin list-all path", () => {
    expect(COLLECTION_ACCESS.ownerScopedOnly).toBe(true);
    expect(COLLECTION_ACCESS.allowAdminBypass).toBe(false);
    expect(COLLECTION_ACCESS.adminListAllPath).toBeNull();
    for (const op of COLLECTION_ACCESS.operations) {
      const spec = collectionOwnershipSpec(op);
      expect(spec.requireAuthUserId).toBe(true);
      expect(spec.filterByUserId).toBe(true);
      expect(spec.allowAdminBypass).toBe(false);
      expect(spec.adminListAllPath).toBeNull();
    }
    expect(actorOwnsCollection("a", "a")).toBe(true);
    expect(actorOwnsCollection("owner-1", "admin-2")).toBe(false);
    expect(actorOwnsCollection("", "x")).toBe(false);
  });

  it("scopes list/create/update/delete to signed-in user_id (source contract)", () => {
    const fns = source("src/lib/research/collections.functions.ts");
    expect(fns).toContain("listEvidenceCollections");
    expect(fns).toContain("createEvidenceCollection");
    expect(fns).toContain("updateEvidenceCollection");
    expect(fns).toContain("deleteEvidenceCollection");

    // Every mutation path must AND on userId — no id-only delete/update.
    expect(fns).toMatch(
      /delete\(evidenceCollections\)[\s\S]*?and\(\s*eq\(evidenceCollections\.id[\s\S]*?eq\(evidenceCollections\.userId/,
    );
    expect(fns).toMatch(
      /update\(evidenceCollections\)[\s\S]*?and\(\s*eq\(evidenceCollections\.id[\s\S]*?eq\(evidenceCollections\.userId/,
    );
    expect(fns).toMatch(/where\(eq\(evidenceCollections\.userId,\s*userId\)\)/);
    expect(fns).toMatch(/insert\(evidenceCollections\)[\s\S]*userId/);

    // No casual admin bypass / list-all of other members' collections.
    expect(fns).not.toMatch(/requireAdmin|isAdmin|listAllEvidenceCollections|adminListAll/i);
    expect(fns).toMatch(/Admin role is never consulted/i);
    expect(fns).toContain("COLLECTION_ACCESS");
    expect(fns).toMatch(/kgWrite:\s*false/);
    expect(fns).not.toMatch(/insert\(evidenceRecords/);

    expect(planEvidenceCollection({ userId: null, name: "x", conceptIds: ["D012"] }).ok).toBe(false);
  });
});

describe("P0/P1 research-gap label provenance", () => {
  it("states ISI curated coverage — never worldwide literature absence", () => {
    expect(EVIDENCE_GAP_PROVENANCE_NOTE).toMatch(/ISI curated/i);
    expect(EVIDENCE_GAP_PROVENANCE_NOTE).toMatch(/not a claim that no literature exists worldwide/i);
    expect(evidenceGapLabelText("no_mapped_evidence")).toMatch(/ISI/i);
    expect(evidenceGapLabelText("no_direct_evidence_after_search")).toMatch(/ISI search scope/i);
    expect(evidenceGapLabelDescription("no_direct_evidence_after_search")).toMatch(
      /not a claim that no papers exist elsewhere/i,
    );
    const ui = source("src/components/immune/EvidenceCollectionsPanel.tsx");
    expect(ui).toContain("EVIDENCE_GAP_PROVENANCE_NOTE");
    const brief = source("src/lib/research/researchBrief.ts");
    expect(brief).toMatch(/not “no literature worldwide”|not.*no literature worldwide/i);
  });
});

describe("P1 persistence clarity", () => {
  it("distinguishes Neon collections vs localStorage workbench drafts", () => {
    const panel = source("src/components/immune/EvidenceCollectionsPanel.tsx");
    expect(panel).toMatch(/sync across devices/i);
    expect(panel).toMatch(/localStorage/i);
    const wb = source("src/components/immune/ScientificWorkbench.tsx");
    expect(wb).toMatch(/localStorage/i);
    expect(wb).toMatch(/does not sync to Neon|does not sync/i);
    const route = source("src/routes/research.tsx");
    expect(route).toMatch(/Neon-backed|syncs across devices/i);
    expect(route).toMatch(/localStorage \(device-only/i);
  });
});

describe("P0 Ask citation / abstention smoke", () => {
  it("abstains on personal clinical and rejects fabricated PMID", () => {
    const clinical = prepareAsk("Should I increase my methotrexate dose tomorrow?");
    expect(clinical.callModel).toBe(false);
    expect(clinical.grounding.trace.abstained).toBe(true);

    const grounded = prepareAsk("How does TNF relate to rheumatoid arthritis?");
    expect(grounded.grounding.nodes.length).toBeGreaterThan(0);
    const fabricated = validateAnswerCitations("See PMID 99999999.", grounded.grounding);
    expect(fabricated.ok).toBe(false);
    expect(fabricated.inventedRelIds.some((id) => /PMID.*99999999/i.test(id))).toBe(true);
  });
});

describe("P0 regression flags", () => {
  it("keeps Trial Intelligence off by default and kgWrite false on workbench surfaces", () => {
    delete process.env.VITE_TRIAL_INTELLIGENCE;
    delete process.env.TRIAL_INTELLIGENCE;
    expect(isTrialIntelligenceEnabled()).toBe(false);

    const brief = source("src/lib/research/researchBrief.ts");
    expect(brief).toMatch(/kgWrite:\s*false/);
    const collections = source("src/lib/research/collections.ts");
    expect(collections).toMatch(/kgWrite:\s*false/);
    const apply0015 = source("scripts/apply-trial-intelligence-migration.ts");
    const apply0016 = source("scripts/apply-evidence-collections-migration.ts");
    expect(apply0015).toMatch(/sql\.begin/);
    expect(apply0016).toMatch(/sql\.begin/);
    expect(apply0015).not.toMatch(/console\.(log|error).*DATABASE_URL/);
    expect(apply0016).not.toMatch(/console\.(log|error).*DATABASE_URL/);
  });
});
