import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  JOURNALS,
  type JournalIssn,
  type LibraryArticle,
  type LibraryPage,
} from "@/lib/research/crossref";
import { searchNatureImmunology } from "@/lib/research/natureImmunology.functions";
import { suggestConceptMatches } from "@/lib/research/literatureWorkflow";
import { Link } from "@tanstack/react-router";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; page: LibraryPage };

type Props = {
  initialQuery?: string;
  onPropose?: (article: LibraryArticle) => void;
};

const YEAR_NOW = new Date().getFullYear();

export default function ResearchLibrary({ initialQuery = "", onPropose }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [author, setAuthor] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [untilYear, setUntilYear] = useState("");
  const [oa, setOa] = useState(false);
  const [journal, setJournal] = useState<JournalIssn | "">("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [cursors, setCursors] = useState<string[]>(["0"]);
  const [open, setOpen] = useState<string | null>(null);

  const run = useCallback(
    async (cursor: string, history: string[]) => {
      setState({ kind: "loading" });
      const yr = (v: string) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : undefined;
      };
      try {
        const res = await searchNatureImmunology({
          data: { q, author, journal: journal || undefined, fromYear: yr(fromYear), untilYear: yr(untilYear), openAccessOnly: oa, cursor, rows: 20 },
        });
        if (res.ok) {
          setState({ kind: "ready", page: res.page });
          setCursors(history);
        } else setState({ kind: "error", message: res.error });
      } catch {
        setState({ kind: "error", message: "Search could not be completed. Check the filters and try again." });
      }
    },
    [q, author, fromYear, untilYear, oa, journal],
  );

  // Load the latest issue list once on mount.
  useEffect(() => {
    void run("0", ["0"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = state.kind === "ready" ? state.page : null;

  return (
    <div className="isi-library">
      <p className="isi-library-source">
        Article metadata from Crossref for {JOURNALS.map((j) => j.name).join(", ")}. Titles, authors, dates, DOIs and
        licences come from the publisher's deposit; abstracts appear only when deposited. Full text stays on the publisher
        site. These records are <b>source material</b>, not reviewed evidence. No endorsement by, or affiliation with,
        Nature Portfolio is implied.
      </p>

      <form
        className="isi-library-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run("0", ["0"]);
        }}
      >
        <div className="isi-field isi-field-wide">
          <Label htmlFor="lib-q">Title, keyword or DOI</Label>
          <Input id="lib-q" value={q} maxLength={200} placeholder="e.g. regulatory T cells or 10.1038/…" onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="isi-field">
          <Label htmlFor="lib-author">Author</Label>
          <Input id="lib-author" value={author} maxLength={120} placeholder="Surname" onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="isi-field">
          <Label htmlFor="lib-journal">Journal</Label>
          <select id="lib-journal" className="isi-select" value={journal} onChange={(e) => setJournal(e.target.value as JournalIssn | "")}>
            <option value="">All five journals</option>
            {JOURNALS.map((j) => <option key={j.issn} value={j.issn}>{j.name}</option>)}
          </select>
        </div>
        <div className="isi-field isi-field-narrow">
          <Label htmlFor="lib-from">From year</Label>
          <Input id="lib-from" inputMode="numeric" value={fromYear} placeholder="2018" onChange={(e) => setFromYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
        <div className="isi-field isi-field-narrow">
          <Label htmlFor="lib-until">To year</Label>
          <Input id="lib-until" inputMode="numeric" value={untilYear} placeholder={String(YEAR_NOW)} onChange={(e) => setUntilYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
        <div className="isi-field isi-field-check">
          <Checkbox id="lib-oa" checked={oa} onCheckedChange={(v) => setOa(v === true)} />
          <Label htmlFor="lib-oa">Open access only</Label>
        </div>
        <Button type="submit" disabled={state.kind === "loading"}>
          <Search size={16} /> Search
        </Button>
      </form>

      <div className="isi-library-status" role="status" aria-live="polite">
        {state.kind === "loading" && "Searching article metadata…"}
        {state.kind === "error" && <span className="isi-error">{state.message}</span>}
        {page && (
          <>
            {page.total !== null ? `${page.total.toLocaleString()} matching records` : "Results"} · last synchronised{" "}
            {new Date(page.fetchedAt).toLocaleString()} · {page.source}
            {page.openAccessFilteredLocally && " · open-access filter applies to this page of results"}
          </>
        )}
      </div>

      {page && page.articles.length === 0 && (
        <p className="isi-empty">No articles match these filters. Try a broader keyword or remove the year range.</p>
      )}

      {page && page.articles.length > 0 && (
        <ol className="isi-article-list">
          {page.articles.map((a) => {
            const expanded = open === a.doi;
            const concepts = suggestConceptMatches(a.title, 4);
            return (
              <li key={a.doi} className="isi-article">
                <div className="isi-article-meta">
                  <span>{a.published ?? "Date not deposited"}</span>
                  <span>{a.journal}</span>
                  <span className="isi-tag">{a.articleKind ?? "Type not provided by source"}</span>
                  <span className={`isi-tag${a.openAccess ? " isi-tag-oa" : ""}`}>
                    {a.openAccess ? "Open access" : "Licence: publisher"}
                  </span>
                  <span className="isi-tag">Source metadata · not reviewed</span>
                </div>
                <h3>{a.title}</h3>
                <p className="isi-article-authors">
                  {a.authors.length ? a.authors.slice(0, 6).join(", ") + (a.authors.length > 6 ? ` +${a.authors.length - 6}` : "") : "Authors not deposited"}
                </p>
                <div className="isi-article-actions">
                  <Button variant="outline" size="sm" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : a.doi)}>
                    {expanded ? "Hide details" : "Details"}
                  </Button>
                  <a className="isi-link" href={a.publisherUrl} target="_blank" rel="noreferrer">
                    Read on publisher site <ExternalLink size={13} />
                  </a>
                  {onPropose && (
                    <Button variant="ghost" size="sm" onClick={() => onPropose(a)}>
                      Propose as evidence candidate
                    </Button>
                  )}
                </div>
                {expanded && (
                  <div className="isi-article-detail">
                    <dl>
                      <dt>DOI</dt>
                      <dd><a href={a.doiUrl} target="_blank" rel="noreferrer">{a.doi}</a></dd>
                      <dt>Journal</dt>
                      <dd>{a.journal}</dd>
                      <dt>Record type</dt>
                      <dd>{a.crossrefType ?? "Not deposited"} (article category is not exposed by the source)</dd>
                      <dt>Licences</dt>
                      <dd>{a.licenses.length ? a.licenses.map((l) => <div key={l}><a href={l} target="_blank" rel="noreferrer">{l}</a></div>) : "None deposited"}</dd>
                    </dl>
                    <h4>Abstract</h4>
                    <p>{a.abstract ?? "No abstract was deposited with the metadata service. Read it on the publisher site."}</p>
                    {concepts.length > 0 && (
                      <>
                        <h4>Possibly related graph concepts</h4>
                        <p className="small muted">Matched by title words only — a navigation aid, not a verified finding or evidence link.</p>
                        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                          {concepts.map((c) => <Link key={c.id} className="chip" to="/atlas/$id" params={{ id: c.id }}>{c.name}</Link>)}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {page && (cursors.length > 1 || page.nextCursor) && (
        <div className="isi-pager">
          <Button
            variant="outline"
            size="sm"
            disabled={cursors.length <= 1 || state.kind !== "ready"}
            onClick={() => {
              const prev = cursors.slice(0, -1);
              void run(prev[prev.length - 1]!, prev);
            }}
          >
            Previous
          </Button>
          <span className="small muted">Page {cursors.length}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!page.nextCursor || state.kind !== "ready"}
            onClick={() => page.nextCursor && void run(page.nextCursor, [...cursors, page.nextCursor])}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
