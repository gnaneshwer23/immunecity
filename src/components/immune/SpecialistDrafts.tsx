import { SPECIALIST_DRAFTS } from "@/lib/ai/specialistDrafts";

/** Labeled drafts only. There is no control that runs an agent. */
export function SpecialistDrafts() {
  return (
    <div className="stack" style={{ gap: 12 }}>
      {SPECIALIST_DRAFTS.map((draft) => (
        <article key={draft.id} className="card" aria-label={draft.name}>
          <p className="kicker">Draft pending human review</p>
          <h3 style={{ fontSize: "1.05rem", margin: "6px 0" }}>{draft.name}</h3>
          <p>{draft.summary}</p>
          <p className="xs muted">
            This is a draft. It does not run on its own, does not publish, does not write the knowledge graph, and is not medical advice.
          </p>
        </article>
      ))}
    </div>
  );
}
