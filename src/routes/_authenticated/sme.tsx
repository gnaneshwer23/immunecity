import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import SmeReviewWorkspace from "@/components/immune/SmeReviewWorkspace";
import MelanomaPilotChecklist from "@/components/immune/MelanomaPilotChecklist";
import { getMyRole } from "@/lib/evidence.functions";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "workspace", label: "Review workspace" },
  { id: "checklist", label: "Melanoma matrix" },
  { id: "links", label: "Related tools" },
];

export const Route = createFileRoute("/_authenticated/sme")({
  validateSearch: zodValidator(
    z.object({
      gapKey: fallback(z.string(), "").default(""),
    }),
  ),
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
  const { gapKey } = Route.useSearch();
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
    <main className="page isi-sme-page">
      <PageHead
        kicker="Investigate · Trust"
        title="SME review workspace"
        lede="Human-only Gate C, KEYNOTE rematch, R011 S-P-O proposals, and gold-set labelling for the melanoma pilot. Decisions are audited; engineering never invents PMIDs or bulk-approves claims. Educational beta — not clinical decision support."
        stats={[
          { v: roleLabel, l: "Signed-in role" },
          { v: "Human", l: "Gate C decisions" },
          { v: "Audited", l: "Rematch writes" },
        ]}
      />
      <PageToc items={TOC} />

      <Section
        id="workspace"
        title="Review workspace"
        lede="Priority KEYNOTE and R011 queues, Discovery gap candidates, honest eval denominators, and reviewer actions — pending_sme until a scientist decides."
      >
        <SmeReviewWorkspace gapKey={gapKey || undefined} />
      </Section>

      <Section
        id="checklist"
        title="Melanoma pilot matrix"
        lede="Engineering validation matrix mirror. Every row stays unreviewed until an SME records a decision elsewhere."
      >
        <MelanomaPilotChecklist />
      </Section>

      <Section
        id="links"
        title="Related tools"
        lede="Reuse Neon curation and Discovery gap review — this page does not replace them."
      >
        <ul className="isi-library-list isi-sme-links">
          <li>
            <Link to="/curation">
              <strong>Evidence curation</strong>
              <span className="muted"> Scientific review queue and identifier checks</span>
            </Link>
          </li>
          <li>
            <Link to="/discovery">
              <strong>Discovery Radar</strong>
              <span className="muted"> Gap candidates before reviewed_gap</span>
            </Link>
          </li>
          <li>
            <Link to="/methods">
              <strong>Methods</strong>
              <span className="muted"> Evidence lifecycle and limitations</span>
            </Link>
          </li>
          <li>
            <span>
              <strong>Operator guide</strong>
              <span className="muted">
                {" "}
                <code>docs/ISI_SME_WORKSPACE.md</code> in the repo
              </span>
            </span>
          </li>
        </ul>
      </Section>
    </main>
  );
}
