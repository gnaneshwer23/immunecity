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
  { id: "checklist", label: "Melanoma evidence matrix" },
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
      title: `Scientific review workspace — ${PRODUCT_NAME}`,
      description:
        "Scientific reviewer workspace for evidence decisions, citation rematch, and gold-set labelling. Educational — not CDS. No bulk approve.",
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
        kicker="Research · Trust"
        title="Scientific review workspace"
        lede="Human-only evidence decisions, citation rematch, relationship rewrite proposals, and expert labelling for the melanoma pilot. Every decision is audited. Educational beta — not clinical decision support."
        stats={[
          { v: roleLabel, l: "Signed-in role" },
          { v: "Human", l: "Evidence decisions" },
          { v: "Audited", l: "Citation rematch" },
        ]}
      />
      <PageToc items={TOC} />

      <Section
        id="workspace"
        title="Review workspace"
        lede="Priority citation and relationship queues, Discovery research candidates, honest evaluation denominators, and reviewer actions — items stay awaiting review until a scientist decides."
      >
        <SmeReviewWorkspace gapKey={gapKey || undefined} />
      </Section>

      <Section
        id="checklist"
        title="Melanoma evidence matrix"
        lede="Validation checklist for the melanoma pilot. Every row stays unreviewed until a scientific reviewer records a decision."
      >
        <MelanomaPilotChecklist />
      </Section>

      <Section
        id="links"
        title="Related tools"
        lede="Reuse evidence curation and Discovery gap review — this page does not replace them."
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
              <span className="muted"> Research candidates before human-reviewed gaps</span>
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
                Repository docs for reviewers (<code>docs/ISI_SME_WORKSPACE.md</code>)
              </span>
            </span>
          </li>
        </ul>
      </Section>
    </main>
  );
}
