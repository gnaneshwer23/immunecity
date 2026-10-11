import { createFileRoute, Link } from "@tanstack/react-router";
import { SEM } from "@/lib/immune/engine";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { PROMPT_VERSION } from "@/lib/askGrounding";
import { PageHead } from "@/components/immune/ui";
import { STATUS_INFO, type ReviewStatus } from "@/lib/immune/evidenceStatus";

export const Route = createFileRoute("/methods")({
  head: () => ({
    meta: [
      { title: "Methods & trust — Immune City" },
      { name: "description", content: "How Immune City builds its causal immunology graph, reviews evidence, runs its models and where its limits are." },
      { property: "og:title", content: "Methods & trust — Immune City" },
      { property: "og:description", content: "Ontology, relationship signs, evidence review statuses, model assumptions and limitations." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Methods,
});

function Methods() {
  const snap = graphReleaseSnapshot();
  const signs = Object.entries(SEM).reduce<Record<string, string[]>>((a, [rel, s]) => ((a[s] ||= []).push(rel), a), {});
  return (
    <div className="page methods">
      <PageHead kicker="Methods & trust" title="How Immune City works — and where it stops"
        lede="Immune City is an educational causal map. This page documents what the graph contains, how evidence is reviewed, what the models assume, and what they cannot tell you."
        stats={[{ v: snap.coreNodes, l: "CORE CONCEPTS" }, { v: snap.draftNodes, l: "DRAFT CONCEPTS" }, { v: snap.draftRelationships, l: "DRAFT LINKS" }]} />

      <section className="section"><h2>1. The graph ontology</h2>
        <p>Every concept is a typed node (cell, molecule, receptor, pathway, tissue, pathogen, disease, therapy, biomarker, trial and more) with a stable ID. Every link is one directional claim — subject, predicate, object — with a stable relationship ID of the form <code>REL-subject-predicate-object</code>, a mechanism, a confidence and, where known, a tissue.</p>
        <p>Release <code>{snap.snapshotAt}</code>: core graph v{snap.coreVersion} has {snap.coreNodes} concepts and {snap.coreRelationships} links. Extensions {snap.extensionsVersion} add {snap.draftNodes} draft concepts and {snap.draftRelationships} draft links; drafts are always labelled <b>Draft</b> and never counted as approved evidence. Runtime total is {snap.runtimeNodes} concepts / {snap.runtimeRelationships} links.</p>
        {snap.versionNotes ? <p className="small muted">{snap.versionNotes}</p> : null}
      </section>

      <section className="section"><h2>2. Relationship signs</h2>
        <ul>
          <li><b>+</b> carries an effect forward (e.g. {signs["+"]?.slice(0, 4).join(", ")}).</li>
          <li><b>−</b> flips it (e.g. {signs["-"]?.slice(0, 4).join(", ")}).</li>
          <li><b>r+</b> is descriptive; a positive effect flows from object back to subject (e.g. {signs["r+"]?.slice(0, 3).join(", ")}).</li>
          <li>Other predicates are descriptive only and are not used in simulations.</li>
        </ul>
      </section>

      <section className="section"><h2>3. Evidence review</h2>
        <p>A source supports a link only when a curator maps it to that exact relationship ID and records that it supports the claim. Citations attached to a concept describe the concept and never count as support for a link. Coverage figures on the <Link to="/evidence">Evidence</Link> page use only claim-checked support.</p>
        <table className="rs-table"><tbody>
          {(Object.keys(STATUS_INFO) as ReviewStatus[]).map((s) => <tr key={s}><td><span className={`badge rs rs-${s}`}>{STATUS_INFO[s].label}</span></td><td className="small">{STATUS_INFO[s].desc}</td></tr>)}
        </tbody></table>
        <p className="small">Inclusion criteria: peer-reviewed primary research, systematic reviews or regulatory documents with a PubMed ID or DOI; identifiers are checked against PubMed and Crossref metadata before approval. Approval records the reviewer and date.</p>
      </section>

      <section className="section" id="models"><h2>4. Model assumptions</h2>
        <ul>
          <li><b>Perturbation (graph):</b> signed spread along + / − / r+ links, decaying 28% per hop, weighted by confidence (high 1.0, medium 0.8, low 0.6) or a measured weight, up to 4 hops. It shows direction, not magnitude in real units.</li>
          <li><b>System simulator:</b> a small set of coupled equations for pathogen, innate and adaptive response, cytokines, damage, memory and exhaustion, in normalised units with hand-set parameters. It is not fitted to patient data.</li>
          <li><b>Patient layer:</b> transparent additive rules; each score lists the rules that produced it. It is not a clinical decision tool.</li>
          <li><b>Ask Immune City:</b> queries are classified, graph context is retrieved, then an AI model may synthesise only from that extract (prompt {PROMPT_VERSION}). Unsupported, omics-not-wired and personal clinical questions abstain without model synthesis. Answers can still be wrong.</li>
          <li><b>Advanced model adapters</b> (omics, structure, epitope, genomics agents) are listed as planned interfaces only — none are implemented in production.</li>
        </ul>
      </section>

      <section className="section"><h2>5. Limitations</h2>
        <ul>
          <li>Most links have not yet been claim-checked against a source; evidence coverage is incomplete and does not imply clinical validation.</li>
          <li>Links simplify dose, timing, species and individual variation.</li>
          <li>Tissue context is sparse; many effects are recorded without one.</li>
          <li>Nothing here is medical advice.</li>
        </ul>
      </section>

      <section className="section"><h2>6. Accessibility</h2>
        <p>The knowledge graph has a <Link to="/graph">text table view</Link> with every link, keyboard focus is always visible, and detail drawers close with Escape. Please report barriers via the curation team.</p>
      </section>
    </div>
  );
}
