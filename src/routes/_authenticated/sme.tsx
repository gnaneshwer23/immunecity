import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import SmeReviewWorkspace from "@/components/immune/SmeReviewWorkspace";
import MelanomaPilotChecklist from "@/components/immune/MelanomaPilotChecklist";
import { getMyRole } from "@/lib/evidence.functions";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "workspace", label: "SME workspace" },
  { id: "checklist", label: "Melanoma checklist" },
  { id: "links", label: "Related tools" },
];

export const Route = createFileRoute("/_authenticated/sme")({
  head: () =>
    seoHead({
      title: `SME review workspace — ${PRODUCT_NAME}`,
      description:
        "Scientific reviewer workspace for Gate C, melanoma pilot, KEYNOTE rematch, and gold-set labelling. Educational — not CDS. No bulk approve.",
      path: "/sme",
      noIndex: true,
    }),
  component: SmePage,
});

function SmePage() {
  const roleFn = useServerFn(getMyRole);
  const [roleLabel, setRoleLabel] = useState<string>("…");

  useEffect(() => {
    roleFn()
      .then((r) => {
        setRoleLabel(
          r.administrator ? "administrator" : r.canReview ? "scientific reviewer" : r.role ?? "member",
        );
      })
      .catch(() => setRoleLabel("member"));
  }, [roleFn]);

  return (
    <main className="page">
      <PageHead
        kicker="Investigate · Trust"
        title="SME review workspace"
        lede="Enable scientific reviewers to complete Gate C, melanoma pilot, KEYNOTE rematch, and gold-set labelling — without inventing PMIDs or bulk-approving claims. Educational beta — not clinical decision support."
      />
      <PageToc items={TOC} />
      <p className="xs muted" style={{ marginBottom: 16 }}>
        Signed in · {roleLabel}. Decisions are audited. Rematch requires PMID + DOI + passage locator.
      </p>

      <Section
        id="workspace"
        title="Review queue & gold-set"
        lede="Flagged melanoma / Discovery candidates, priority KEYNOTE and R011 items as pending_sme, and honest eval denominators."
      >
        <SmeReviewWorkspace />
      </Section>

      <Section
        id="checklist"
        title="Melanoma pilot checklist"
        lede="Engineering matrix mirror — all rows remain unreviewed until an SME decides."
      >
        <MelanomaPilotChecklist />
      </Section>

      <Section id="links" title="Related tools" lede="Reuse existing Neon curation and Discovery gap review paths.">
        <ul className="small">
          <li>
            <Link to="/curation">Evidence curation</Link> — scientific review queue + identifier checks
          </li>
          <li>
            <Link to="/discovery">Discovery Radar</Link> — gap candidates (human review before reviewed_gap)
          </li>
          <li>
            <Link to="/methods">Methods</Link> — evidence lifecycle and limitations
          </li>
          <li>
            Operator guide: <code>docs/ISI_SME_WORKSPACE.md</code> in the repo
          </li>
        </ul>
      </Section>
    </main>
  );
}
