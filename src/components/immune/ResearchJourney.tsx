import { Link } from "@tanstack/react-router";

export default function ResearchJourney({ compact = false }: { compact?: boolean }) {
  return <section className={`research-journey${compact ? " research-journey-compact" : ""}`} aria-label="Research workbench journey">
    {!compact && <div className="research-journey-intro">
      <span className="mkt-section-label">Research workbench</span>
      <h2>Follow a question from context to investigation.</h2>
      <p>Explore conditions, inspect longitudinal observations, test a research scenario and prepare a reviewable dossier.</p>
      <Link className="btn primary" to="/research" hash="synthetic-programme">Open research workbench →</Link>
      <p className="xs muted">Interactive demonstration with fictional records. Research use only.</p>
    </div>}
    <ol className="research-journey-steps">
      <li><span>01</span><Link to="/research" hash="synthetic-programme">Choose a condition</Link><p>20 contexts across immune, gut, brain and metabolic research.</p></li>
      <li><span>02</span><Link to="/research" hash="programme-observations">Inspect the record</Link><p>Follow labs, lifestyle, medications and immune measurements over time.</p></li>
      <li><span>03</span><Link to="/research" hash="programme-discovery">Investigate a hypothesis</Link><p>Change scenario inputs and inspect a testable research plan.</p></li>
      <li><span>04</span><Link to="/research" hash="programme-trials">Review criteria & export</Link><p>Inspect fictional protocol checks and download a traceable dossier.</p></li>
    </ol>
  </section>;
}
