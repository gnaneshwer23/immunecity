import { createFileRoute, Link } from "@tanstack/react-router";
import { CausalSpine } from "@/components/immune/CausalSpine";
import { IsiCityBand } from "@/components/immune/IsiCityBand";
import { seoHead } from "@/lib/seo";
import {
  AUDIENCES, DIFFERENTIATORS, NORTH_STAR, NOT_LIST, STAGES,
  VISION_CORE, VISION_HEADLINE, VISION_MOTTO, VISION_STATEMENT,
} from "@/data/vision";

export const Route = createFileRoute("/vision")({
  head: () =>
    seoHead({
      title: "The Vision — Immune Super Intelligence",
      description:
        "Why Immune Super Intelligence exists: an evidence-aware platform making the immune system understandable, connected and investigable.",
      path: "/vision",
    }),
  component: VisionPage,
});

function VisionPage() {
  return (
    <div className="home-page vision-page">
      <div className="bio-content home-sections">
        <section className="bio-section vision-hero" aria-labelledby="vision-h1">
          <div className="bio-eyebrow">The Vision</div>
          <h1 id="vision-h1">{VISION_HEADLINE}</h1>
          <p className="hero-description">{VISION_STATEMENT}</p>
          <blockquote className="vision-quote">{VISION_CORE}</blockquote>
          <p className="vision-motto">{VISION_MOTTO.join(". ")}.</p>
        </section>

        <IsiCityBand />

        <section className="bio-section" aria-labelledby="spine-h">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Causal spine</span>
              <h2 id="spine-h">Connect the entire chain.</h2>
            </div>
            <p>A structure you can traverse — not a decorative diagram. Pick a stage.</p>
          </div>
          <CausalSpine />
        </section>

        <section className="bio-section" aria-labelledby="diff-h">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Difference</span>
              <h2 id="diff-h">Connected, inspectable scientific reasoning.</h2>
            </div>
          </div>
          <div className="vision-grid">
            {DIFFERENTIATORS.map((d) => (
              <article key={d.k} className="vision-card">
                <span className="spine-num">{d.k}</span>
                <h3>{d.title}</h3>
                <p>{d.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bio-section" aria-labelledby="stages-h">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Roadmap</span>
              <h2 id="stages-h">Four connected stages.</h2>
            </div>
            <p>Strategic ambitions — not a claim that every capability exists today.</p>
          </div>
          <ol className="vision-grid">
            {STAGES.map((s) => (
              <li key={s.n} className="vision-card">
                <span className="spine-num">Stage {s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.copy}</p>
                <p className="vision-now"><strong>Where we are:</strong> {s.now}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bio-section" aria-labelledby="who-h">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Audience</span>
              <h2 id="who-h">One foundation, many workflows.</h2>
            </div>
          </div>
          <ul className="home-limit-list">
            {AUDIENCES.map((a) => (
              <li key={a.who}><strong>{a.who}</strong><span>{a.what}</span></li>
            ))}
          </ul>
        </section>

        <section className="bio-section" aria-labelledby="not-h">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">Boundaries</span>
              <h2 id="not-h">What this is not.</h2>
            </div>
          </div>
          <ul className="vision-not">
            {NOT_LIST.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </section>

        <section className="bio-section" aria-labelledby="ns-h">
          <div className="bio-section-heading">
            <div>
              <span className="mkt-section-label">North star</span>
              <h2 id="ns-h">From a question to a reviewed hypothesis.</h2>
            </div>
            <p>Why might an inflammatory pathway drive disease — and is it a useful target?</p>
          </div>
          <ol className="home-steps">
            {NORTH_STAR.map((s, i) => (
              <li key={s.path} className="home-step">
                <span className="home-step-n">{String(i + 1).padStart(2, "0")}</span>
                <p>{s.step}</p>
                <Link to={s.path}>Open →</Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

