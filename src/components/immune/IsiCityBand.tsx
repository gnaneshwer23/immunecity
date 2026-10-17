import { CITY_LAYER, ISI_LAYER } from "@/data/vision";

export function IsiCityBand() {
  return (
    <section className="bio-section" aria-labelledby="isi-city-h">
      <div className="bio-section-heading">
        <div>
          <span className="bio-section-number">ISI + IMMUNE CITY</span>
          <h2 id="isi-city-h">The world, and the intelligence that navigates it.</h2>
        </div>
        <p>AI sits on top of the knowledge and evidence — never in place of it.</p>
      </div>
      <div className="isi-city">
        <article className="vision-card">
          <span className="spine-num">{ISI_LAYER.role}</span>
          <h3>{ISI_LAYER.title}</h3>
          <p>{ISI_LAYER.points.join(" · ")}</p>
        </article>
        <article className="vision-card">
          <span className="spine-num">{CITY_LAYER.role}</span>
          <h3>{CITY_LAYER.title}</h3>
          <p>{CITY_LAYER.copy}</p>
          <ul className="isi-modes">
            {CITY_LAYER.modes.map((m) => (
              <li key={m.label}><strong>{m.label}</strong> {m.copy}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
