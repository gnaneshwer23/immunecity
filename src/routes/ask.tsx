import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import AskAtlas from "@/components/immune/AskAtlas";
import { PageHead } from "@/components/immune/ui";
import { byId } from "@/lib/immune/engine";
import { askPrefill } from "@/lib/immune/concepts";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

const ASK_SUGGESTIONS = [
  { label: "Foundations", items: ["What is the difference between innate and adaptive immunity?", "How do antibodies work?", "Explain antigen presentation."] },
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
      title: `Ask ISI — immunology questions answered from the graph | ${PRODUCT_NAME}`,
      description:
        "Ask immunology questions from foundations to research. Answers retrieve concepts and links from the curated knowledge graph, show evidence status and link to concept pages. Educational; not medical advice.",
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
        kicker="Ask ISI"
        title="Ask about the immune system."
        lede="Answers are built from concepts and links retrieved from the curated knowledge graph. Each matched concept opens its own page; reviewed citations appear only where they exist, and missing evidence is said out loud. Your conversation is kept in this browser only."
      />
      {ctx ? (
        <p className="isi-ask-context" role="status">
          Context: <Link to="/atlas/$id" params={{ id: ctx.id }}>{ctx.name}</Link>. You can still ask anything.
        </p>
      ) : null}
      <AskAtlas persistKey="isi-ask-conversation" initialInput={askPrefill(about, q)} groupedSuggestions={ASK_SUGGESTIONS} />
      <p className="xs muted" style={{ marginTop: 16 }}>
        For personal symptoms, diagnosis or treatment, speak to a qualified clinician. ISI gives general education only.{" "}
        <Link to="/methods">How answers are built</Link> · <Link to="/atlas">Browse the Knowledge Atlas</Link>
      </p>
    </div>
  );
}
