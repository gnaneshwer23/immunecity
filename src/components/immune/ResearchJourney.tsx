import { Link } from "@tanstack/react-router";

export default function ResearchJourney({ compact = false }: { compact?: boolean }) {
  return <section className={`research-journey${compact ? " research-journey-compact" : ""}`} aria-label="Explore biology and evidence">
    {!compact && <div className="research-journey-intro">
      <span className="mkt-section-label">Connected immunology</span>
      <h2>Follow the biology. Inspect the evidence.</h2>
      <p>Move from concepts and mechanisms to relationship-specific sources and a better-informed research question.</p>
      <Link className="btn primary" to="/graph">Explore knowledge graph →</Link>
    </div>}
    <ol className="research-journey-steps">
      <li><span>01</span><Link to="/atlas">Explore a concept</Link><p>Find cells, pathways, diseases and interventions in the shared Atlas.</p></li>
      <li><span>02</span><Link to="/graph">Follow its relationships</Link><p>Inspect direction, context and the limits of the mapped mechanism.</p></li>
      <li><span>03</span><Link to="/evidence">Read the evidence</Link><p>Keep source identity, claim support and review status distinct.</p></li>
      <li><span>04</span><Link to="/ask">Ask a research question</Link><p>Explore the map with context, sources and uncertainty in view.</p></li>
    </ol>
  </section>;
}
