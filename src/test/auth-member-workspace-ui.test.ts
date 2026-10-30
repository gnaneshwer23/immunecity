/**
 * Authenticated / member surfaces share ISI workspace anatomy
 * (PageHead → PageToc/Section → queue lists) after the SME layout pass.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
function source(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Auth member workspace UI", () => {
  it("curation uses ISI section anatomy and shared auth shell", () => {
    const src = source("src/routes/_authenticated/curation.tsx");
    expect(src).toContain("isi-auth-page");
    expect(src).toContain("PageToc");
    expect(src).toContain('id="records"');
    expect(src).toContain("isReadyForSupportsApproval");
    expect(src).toContain("supports-assessed");
    expect(src).toMatch(/AI never auto-approves/i);
    expect(src).toMatch(/Do not mass-approve/i);
    expect(src).toContain("Three dimensions stay separate");
    expect(src).toContain("ScientificReviewQueuePanel");
    expect(src).toContain("OntologyMappingPanel");
  });

  it("review and ontology panels drop nested card dumps", () => {
    const queue = source("src/components/immune/ScientificReviewQueuePanel.tsx");
    expect(queue).toContain('data-testid="scientific-review-queue"');
    expect(queue).toContain("isi-auth-queue");
    expect(queue).not.toMatch(/className="card"/);
    expect(queue).toMatch(/No automatic approval/i);

    const onto = source("src/components/immune/OntologyMappingPanel.tsx");
    expect(onto).toContain('data-testid="ontology-mapping-panel"');
    expect(onto).toContain("isi-auth-panel");
    expect(onto).not.toMatch(/className="card"/);
    expect(onto).toMatch(/never invent/i);
  });

  it("workspace and discovery member pages use auth empty / sign-in shells", () => {
    const workspace = source("src/routes/workspace.tsx");
    expect(workspace).toContain("isi-auth-page");
    expect(workspace).toContain("PageToc");
    expect(workspace).toContain("isi-auth-empty");
    expect(workspace).toContain('id="paths"');

    const profile = source("src/routes/discovery.profile.tsx");
    expect(profile).toContain("isi-auth-form");
    expect(profile).toContain("PageToc");
    expect(profile).toContain("isi-auth-sign-in");

    const alerts = source("src/routes/discovery.alerts.tsx");
    expect(alerts).toContain("isi-auth-queue");
    expect(alerts).toContain("Toolbar");

    const onboarding = source("src/routes/discovery.onboarding.tsx");
    expect(onboarding).toContain("isi-auth-form");
    expect(onboarding).toContain("isi-auth-sign-in");
  });

  it("evidence collections keep Neon/localStorage honesty without nested cards", () => {
    const ui = source("src/components/immune/EvidenceCollectionsPanel.tsx");
    expect(ui).toContain("EVIDENCE_GAP_PROVENANCE_NOTE");
    expect(ui).toMatch(/sync across devices/i);
    expect(ui).toMatch(/localStorage/i);
    expect(ui).toContain("updateEvidenceCollection");
    expect(ui).toContain("Update collection");
    expect(ui).toContain("isi-auth-queue");
    expect(ui).not.toMatch(/className="card"/);
  });

  it("shared isi-auth tokens live in isi.css", () => {
    const css = source("src/isi.css");
    expect(css).toContain(".isi-auth-page");
    expect(css).toContain(".isi-auth-queue");
    expect(css).toContain(".isi-auth-empty");
    expect(css).toContain(".isi-auth-panel");
  });
});
