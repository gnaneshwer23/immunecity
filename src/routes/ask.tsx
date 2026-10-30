import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import AskAtlas from "@/components/immune/AskAtlas";
import { PageHead } from "@/components/immune/ui";
import { byId } from "@/lib/immune/engine";
import { askPrefill } from "@/lib/immune/concepts";
import { ASK_EVIDENCE_LIMIT, ASK_NAME, ASK_PUBLIC_LINE, PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

const ASK_SUGGESTIONS = [
  { label: "Foundations", items: ["What is the immune system?", "What is the difference between innate and adaptive immunity?", "How do antibodies work?", "Explain antigen presentation."] },
  { label: "Mechanisms", items: ["How does IL-6 signalling work?", "How does the NLRP3 inflammasome activate inflammation?", "How does T-cell receptor signalling work?"] },
  { label: "Disease", items: ["How do regulatory T cells contribute to immune tolerance?", "What happens to immune function during sepsis?", "How do immune checkpoint inhibitors work?"] },
  { label: "Research", items: ["What evidence supports the role of IL-6 in inflammatory disease?", "Compare competing models of T-cell exhaustion.", "What are the limitations of current evidence on TNF in arthritis?"] },
];

export const Route = createFileRoute("/ask")({
  validateSearch: zodValidator(
    z.object({
      about: fallback(z.string().max(40), "").default(""),
      q: fallback(z.string().max(500), "").default(""),
    }),
  ),
  head: () =>
    seoHead({
      title: `${ASK_NAME} — immunology questions from the graph | ${PRODUCT_NAME}`,
      description:
        "Ask Immune answers from the curated knowledge graph, shows reviewed cites when present, and labels provisional literature clearly. Educational resource — not medical advice; not fully evidence-grounded AI.",
      path: "/ask",
    }),
  component: AskPage,
});

function AskPage() {
  const { about, q } = Route.useSearch();
  const ctx = about ? byId[about] : undefined;
  return (
    <div className="page isi-ask-page">
      <PageHead
        kicker={`Learn · ${ASK_NAME}`}
        title="Ask about the immune system."
        lede={`${ASK_PUBLIC_LINE} Missing evidence is stated clearly. ${ASK_EVIDENCE_LIMIT} This is the primary chatbot for graph-grounded answers and the starting point for Atlas, Discovery, dossiers and the research workbench. Your conversation stays in this browser.`}
      />
      {ctx ? (
        <p className="isi-ask-context" role="status">
          Context: <Link to="/atlas/$id" params={{ id: ctx.id }}>{ctx.name}</Link>. You can still ask about any concept in the graph.
        </p>
      ) : null}
      <AskAtlas persistKey="isi-ask-conversation" initialInput={askPrefill(about, q)} groupedSuggestions={ASK_SUGGESTIONS} />
      <p className="xs muted isi-ask-foot">
        For personal symptoms, diagnosis or treatment, speak to a qualified clinician. {ASK_NAME} is general education
        only — not clinical decision support.{" "}
        <Link to="/methods">How answers are built</Link> · <Link to="/atlas">Browse the Knowledge Atlas</Link>
      </p>
    </div>
  );
}
