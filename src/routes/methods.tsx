import { createFileRoute, Link } from "@tanstack/react-router";
import { SEM } from "@/lib/immune/engine";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { PROMPT_VERSION } from "@/lib/askGrounding";
import { PageHead } from "@/components/immune/ui";
import { STATUS_INFO, type ReviewStatus } from "@/lib/immune/evidenceStatus";
import ModelRegistryPanel from "@/components/immune/ModelRegistryPanel";
import { IMPLEMENTATION_PHASES } from "@/data/implementation-phases";
import { FLAGSHIP_NAME, pageTitle } from "@/lib/brand";

export const Route = createFileRoute("/methods")({
  head: () => ({
    meta: [
      { title: pageTitle("Evidence & Methods") },
      {
        name: "description",
        content: `Understand the ${FLAGSHIP_NAME} graph, source curation, evidence statuses, model assumptions and scientific limitations.`,
      },
      { property: "og:title", content: pageTitle("Evidence & Methods") },
      {
        property: "og:description",
        content: "Ontology, relationship signs, evidence review statuses, model assumptions and limitations.",
      },
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
    <div className="page methods marketing-page">
      <PageHead
        kicker="Evidence & Methods"
        title="See what supports a claim—and where the evidence stops."
        lede={`${FLAGSHIP_NAME} distinguishes a source identifier, metadata verification and scientific assessment of a specific relationship. A citation is only counted as support when it is mapped to that directional claim and reviewed under the platform’s curation process. Educational beta — teaching with references, not clinical decision support.`}
        stats={[{ v: snap.coreNodes, l: "CORE CONCEPTS" }, { v: snap.draftNodes, l: "DRAFT CONCEPTS" }, { v: snap.runtimeRelationships, l: "RUNTIME LINKS" }]}
      />

      <section className="section"><h2>1. The graph ontology</h2>
        <p>Every concept is a typed node (cell, molecule, receptor, pathway, tissue, pathogen, disease, therapy, biomarker, trial and more) with a stable ID. Every link is one directional claim — subject, predicate, object — with a stable relationship ID of the form <code>REL-subject-predicate-object</code>, a mechanism, a confidence and, where known, a tissue.</p>
        <p>Release <code>{snap.snapshotAt}</code>: core graph v{snap.coreVersion} has {snap.coreNodes} concepts and {snap.coreRelationships} links. Extensions {snap.extensionsVersion} add {snap.draftNodes} draft concepts and {snap.draftRelationships} draft links; drafts are always labelled <b>Draft</b> and never counted as approved evidence. Runtime total is {snap.runtimeNodes} concepts / {snap.runtimeRelationships} links (same snapshot used on the homepage and footer).</p>
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
        <p className="small">Inclusion criteria: peer-reviewed primary research, systematic reviews or regulatory documents with a PubMed ID or DOI; identifiers are checked against PubMed and Crossref metadata before approval. Approval requires claim_support = supports (plus a verified/matched identifier) and records the reviewer and date. Live claim-support counts are on <Link to="/evidence">Evidence</Link> — Gate C progress is real but sparse overall versus runtime link count.</p>
        <p className="small">Sign-in and curation use <b>Neon Auth</b> with roles in <code>user_roles</code>. New accounts receive the reader role; admin is provisioned explicitly (not “first signup wins”). Approved citations are served by a server-side filter for public pages.</p>
      </section>

      <section className="section" id="models"><h2>4. Model assumptions</h2>
        <ul>
          <li><b>Perturbation (graph):</b> signed spread along + / − / r+ links, decaying 28% per hop, weighted by confidence (high 1.0, medium 0.8, low 0.6) or a measured weight, up to 4 hops. It shows direction, not magnitude in real units.</li>
          <li><b>System simulator:</b> a small set of coupled equations for pathogen, innate and adaptive response, cytokines, damage, memory and exhaustion, in normalised units with hand-set parameters. It is not fitted to patient data.</li>
          <li><b>Patient layer:</b> transparent additive rules; each score lists the rules that produced it. Educational illustration — not patient-specific advice.</li>
          <li><b>Ask Immune Super Intelligence:</b> queries are classified, graph context is retrieved, reviewed relationship-level citations are attached when they exist for those links, then an AI model may synthesise only from that extract (prompt {PROMPT_VERSION}). Sparse approved cites mean Ask is graph-retrieved, not fully evidence-grounded. Unsupported, omics-not-wired and personal clinical questions abstain without model synthesis. Answers can still be wrong.</li>
          <li><b>Research workbench / literature / model registry:</b> available on <Link to="/research">Research</Link> as candidate workflows and interface contracts (phases B–E partial) — never auto-promoted into the curated graph or live predictors.</li>
          <li><b>Advanced model adapters</b> (omics, structure, pMHC/epitope, genomics, agents) are modular interface contracts only — none are implemented in production. Dry-run stubs return typed <code>not_available</code> and never invent scores or ranks. Full registry with request-shape previews on <Link to="/research" hash="model-registry">Research</Link>.</li>
        </ul>
        <ModelRegistryPanel compact />
      </section>

      <section className="section" id="phases"><h2>4b. Platform phase status</h2>
        <table className="rs-table"><tbody>
          {IMPLEMENTATION_PHASES.map((p) => (
            <tr key={p.id}>
              <td><b>Phase {p.id}</b></td>
              <td>{p.title}</td>
              <td><span className="badge rs">{p.status.replace("_", " ")}</span></td>
              <td className="small">{p.notes}</td>
            </tr>
          ))}
        </tbody></table>
      </section>

      <section className="section"><h2>5. Limitations</h2>
        <ul>
          <li>Most links have not yet been claim-checked against a source; claim-level approved support is still sparse overall (single-digit approved relationship claims vs hundreds of runtime links) and does not imply clinical validation.</li>
          <li>Exemplar progress is uneven: TNF→RA on-path edges have approved claim support; PD-1 / PD-L1 is partially reviewed; type-I IFN→SLE remains largely scaffold-ish outside a few reviewed edges.</li>
          <li>The Immunology Academy foundation track on <Link to="/mechanism">Mechanism</Link> is a navigable teaching scaffold — not a finished curriculum, certification, or Gate C coverage claim.</li>
          <li>Links simplify dose, timing, species and individual variation.</li>
          <li>Tissue context is sparse; many effects are recorded without one.</li>
          <li>This product educates with references; it is not medical advice, clinician decision support, or patient-specific guidance.</li>
        </ul>
      </section>

      <section className="section"><h2>6. Accessibility</h2>
        <p>The knowledge graph has a <Link to="/graph">text table view</Link> with every link, keyboard focus is always visible, and detail drawers close with Escape. Please report barriers via the curation team.</p>
      </section>
    </div>
  );
}
