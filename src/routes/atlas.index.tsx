import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KG, TYPES, byId } from "@/lib/immune/engine";
import { DOMAINS, conceptExtras } from "@/lib/immune/concepts";
import { PageHead } from "@/components/immune/ui";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/atlas/")({
  head: () =>
    seoHead({
      title: `Immunology Knowledge Atlas | ${PRODUCT_NAME}`,
      description: `Browse ${KG.nodes.length} immunology concepts across eight domains — cells, molecules, signalling, disease, therapy, methods and research — each linked to its relationships and evidence status.`,
      path: "/atlas",
    }),
  component: Atlas,
});

function Atlas() {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return KG.nodes
      .filter((n) => [n.name, n.id, ...conceptExtras(n).aliases].some((v) => v.toLowerCase().includes(s)))
      .slice(0, 24);
  }, [q]);
  const gaps = DOMAINS.reduce((a, d) => a + d.topics.filter((t) => !t.covered).length, 0);

  return (
    <div className="page">
      <PageHead
        kicker="Knowledge Atlas"
        title="Every concept, connected."
        lede="Eight domains drawn from the curated knowledge graph. Each concept page shows its definition, direct links, evidence status, learning path and related research. Topics the graph does not cover yet are listed as gaps, not filled with invented content."
        stats={[
          { v: KG.nodes.length, l: "CONCEPTS" },
          { v: DOMAINS.length, l: "DOMAINS" },
          { v: gaps, l: "KNOWN GAPS" },
        ]}
      />

      <section className="section">
        <Label htmlFor="atlas-q">Find a concept</Label>
        <Input id="atlas-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. IL-6, T cell, lupus" style={{ maxWidth: 420, marginTop: 6 }} />
        {q.trim().length >= 2 ? (
          hits.length ? (
            <ul className="isi-atlas-hits" aria-live="polite">
              {hits.map((n) => (
                <li key={n.id}>
                  <Link to="/atlas/$id" params={{ id: n.id }}>{n.name}</Link>{" "}
                  <span className="xs muted">{TYPES[n.node_type].label}{n.draft ? " · draft" : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="isi-empty" style={{ marginTop: 12 }}>No concept matches "{q}". Try Ask ISI for a broader question.</p>
        ) : null}
      </section>

      <div className="isi-domains">
        {DOMAINS.map((d, i) => (
          <section key={d.id} id={d.id} className="isi-domain" aria-labelledby={`dom-${d.id}`}>
            <span className="bio-section-number">{String(i + 1).padStart(2, "0")}</span>
            <h2 id={`dom-${d.id}`}>{d.title}</h2>
            <p className="small muted">{d.blurb}</p>
            {d.conceptIds.length ? (
              <ul className="isi-domain-list">
                {d.conceptIds.slice(0, 14).map((id) => (
                  <li key={id}><Link to="/atlas/$id" params={{ id }}>{byId[id]!.name}</Link></li>
                ))}
              </ul>
            ) : <p className="small">No graph concepts in this domain yet.</p>}
            {d.conceptIds.length > 14 ? <p className="xs muted">+{d.conceptIds.length - 14} more — use search above.</p> : null}
            {d.topics.some((t) => !t.covered) ? (
              <p className="xs isi-gaps"><b>Not yet in the atlas:</b> {d.topics.filter((t) => !t.covered).map((t) => t.label).join(" · ")}</p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
