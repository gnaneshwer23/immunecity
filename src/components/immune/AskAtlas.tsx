import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";
import { Send, Square, Microscope, X, ArrowUpRight, CornerDownRight, Copy, RotateCcw, Maximize2 } from "lucide-react";
import type { UIMessage } from "ai";
import { byId, out, inn, human, TYPES, edgeByRel, relId, type KGEdge } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import { ASK_NAME } from "@/lib/brand";
import { CAPABILITY_STATUS_LABEL } from "@/data/capabilityStatus";
import {
  matchConceptSuggestions,
  prepareAsk,
  runExplanationAction,
  shouldFetchProvisionalLit,
  type AskGrounding,
  type ExplanationAction,
} from "@/lib/askGrounding";
import EdgeReference, { NodeCitations } from "./EdgeReference";
import GroundingPanel from "./GroundingPanel";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "How does TNF drive rheumatoid arthritis?",
  "What connects the gut microbiome to inflammation?",
  "How do checkpoint inhibitors help T cells?",
];

const EXPLAIN_ACTIONS: { id: ExplanationAction; label: string }[] = [
  { id: "explain_mechanism", label: "Explain mechanism" },
  { id: "show_path", label: "Show path" },
  { id: "what_evidence_missing", label: "What evidence is missing?" },
  { id: "what_would_change", label: "What would change this?" },
];

type Pick = { kind: "concept"; id: string } | { kind: "edge"; s: string; o: string };

function findEdge(s: string, o: string): KGEdge | undefined {
  return (out[s] || []).find((e) => e.object_id === o) || (out[o] || []).find((e) => e.object_id === s);
}

/** Collect concept ids referenced in an answer, in order of appearance. */
function conceptsIn(text: string): string[] {
  const ids: string[] = [];
  for (const m of text.matchAll(/\]\((concept|edge):([^)]+)\)/g)) {
    const raw = m[2] ?? "";
    const rel = edgeByRel[raw];
    const parts = m[1] === "concept" ? [raw] : rel ? [rel.subject_id, rel.object_id] : raw.split(":");
    for (const id of parts) if (id && byId[id] && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Build contextual follow-up questions from the concepts in an answer. */
function followUps(ids: string[], asked: Set<string>): string[] {
  const qs: string[] = [];
  const nodes = ids.map((id) => byId[id]).filter((n): n is NonNullable<typeof n> => !!n);
  const drug = nodes.find((n) => n.node_type === "INTERVENTION");
  const cell = nodes.find((n) => n.node_type === "CELL");
  const disease = nodes.find((n) => n.node_type === "DISEASE");
  const path = nodes.find((n) => n.node_type === "PATHWAY" || n.node_type === "MOLECULE");
  if (path) qs.push(`What happens downstream if ${path.name} is blocked?`);
  if (cell) qs.push(`Which signals switch ${cell.name} on and off?`);
  if (disease) qs.push(`Which therapies target ${disease.name}, and what trials tested them?`);
  if (drug) qs.push(`What are the side effects and risks of ${drug.name}?`);
  const first = nodes[0];
  if (first) {
    const nb = [...(out[first.id] || []).map((e) => e.object_id), ...(inn[first.id] || []).map((e) => e.subject_id)]
      .map((id) => byId[id]).find((n) => n && !ids.includes(n.id));
    if (nb) qs.push(`How is ${first.name} connected to ${nb.name}?`);
  }
  return qs.filter((q) => !asked.has(q)).slice(0, 3);
}

function Inspector({ pick, onClose }: { pick: Pick; onClose: () => void }) {
  let body: ReactNode = null;
  if (pick.kind === "concept") {
    const n = byId[pick.id];
    if (!n) return null;
    const edges = [...(out[n.id] || []), ...(inn[n.id] || [])].slice(0, 6);
    body = (
      <>
        <div className="ask-insp-head">
          <span className="dot" style={{ background: `var(${TYPES[n.node_type].c})` }} />
          <strong>{n.name}</strong><span className="sr-type">{TYPES[n.node_type].label}</span>
        </div>
        <p className="xs">{n.desc}</p>
        <div className="ask-insp-label">Connections</div>
        <ul className="ask-insp-list">
          {edges.map((e, i) => {
            const s = byId[e.subject_id], o = byId[e.object_id];
            return <li key={i}>{s?.name} <em>{human(e.relation)}</em> {o?.name}</li>;
          })}
        </ul>
        <div className="ask-insp-label">Sources</div>
        <NodeCitations id={n.id} />
        <div className="ask-insp-actions">
          <Link className="btn sm primary" to="/atlas/$id" params={{ id: n.id }}>Concept page <ArrowUpRight size={14} /></Link>
          <Link className="btn sm" to="/graph" search={{ focus: n.id }}>Highlight in graph <ArrowUpRight size={14} /></Link>
        </div>
      </>
    );
  } else {
    const e = findEdge(pick.s, pick.o);
    const s = byId[pick.s], o = byId[pick.o];
    body = e ? (
      <>
        <div className="ask-insp-head"><strong>{byId[e.subject_id]?.name}</strong><em>{human(e.relation)}</em><strong>{byId[e.object_id]?.name}</strong></div>
        <p className="xs">{e.mechanism}</p>
        <p className="xs muted">Confidence: {e.confidence} · Evidence: {e.evidence_status}{e.location ? ` · Tissue: ${e.location}` : ""}</p>
        <div className="ask-insp-label">Sources</div>
        <EdgeReference edge={e} />
        <div className="ask-insp-actions">
          <Link className="btn sm primary" to="/atlas/$id" params={{ id: e.subject_id }}>Subject page <ArrowUpRight size={14} /></Link>
          <Link className="btn sm" to="/graph" search={{ focus: e.subject_id }}>Highlight in graph <ArrowUpRight size={14} /></Link>
        </div>
      </>
    ) : (
      <p className="xs muted">This connection between {s?.name ?? pick.s} and {o?.name ?? pick.o} isn't a direct link in the graph.</p>
    );
  }
  return (
    <div className="ask-inspector" role="dialog" aria-label="Concept details">
      <button className="ask-insp-close" onClick={onClose} aria-label="Close details"><X size={14} /></button>
      {body}
    </div>
  );
}

export type AskAtlasProps = {
  /** localStorage key for one saved conversation in this browser. */
  persistKey?: string;
  /** Prefilled question (not sent automatically). */
  initialInput?: string;
  /** Show grouped starter questions instead of the short list. */
  groupedSuggestions?: { label: string; items: string[] }[];
  /** Show the "Open full page" link (corner assistant). */
  showFullPageLink?: boolean;
};

export default function AskAtlas({ persistKey, initialInput = "", groupedSuggestions, showFullPageLink }: AskAtlasProps = {}) {
  const { messages, sendMessage, status, stop, error, setMessages, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ask" }),
  });
  const [input, setInput] = useState(initialInput);
  const [restored, setRestored] = useState(!persistKey);
  const [copied, setCopied] = useState<string | null>(null);
  const [provisionalNote, setProvisionalNote] = useState<string | null>(null);
  useEffect(() => {
    if (!persistKey) return;
    try {
      const raw = window.localStorage.getItem(persistKey);
      if (raw) {
        const saved = JSON.parse(raw) as UIMessage[];
        if (Array.isArray(saved)) setMessages(saved);
      }
    } catch { /* ignore corrupt storage */ }
    setRestored(true);
  }, [persistKey, setMessages]);
  useEffect(() => {
    if (!persistKey || !restored || status === "streaming" || status === "submitted") return;
    try {
      if (messages.length) window.localStorage.setItem(persistKey, JSON.stringify(messages.slice(-20)));
      else window.localStorage.removeItem(persistKey);
    } catch { /* storage full or blocked */ }
  }, [persistKey, restored, messages, status]);
  useEffect(() => { if (initialInput) setInput(initialInput); }, [initialInput]);
  const newConversation = () => {
    setMessages([]);
    setGrounding(null);
    setLocalNote(null);
    setProvisionalNote(null);
    setInput("");
    inputRef.current?.focus();
  };
  const copyText = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ }
  };
  const [pick, setPick] = useState<Pick | null>(null);
  const [grounding, setGrounding] = useState<AskGrounding | null>(null);
  const [localNote, setLocalNote] = useState<string | null>(null);
  const busy = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const matches = useMemo(() => {
    if (input.trim().length < 2) return [];
    return matchConceptSuggestions(input, 5);
  }, [input]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status, grounding, localNote, provisionalNote]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const asked = useMemo(
    () => new Set(messages.filter((m) => m.role === "user").flatMap((m) => m.parts.map((p) => (p.type === "text" ? p.text : "")))),
    [messages],
  );

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const prepared = prepareAsk(t);
    setGrounding(prepared.grounding);
    setLocalNote(null);
    setProvisionalNote(null);
    setInput("");
    void (async () => {
      try {
        const res = await fetch("/api/ask/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: t }),
        });
        if (!res.ok) {
          const want = shouldFetchProvisionalLit(prepared.grounding, prepared.queryClass);
          if (want) {
            setProvisionalNote(
              "Provisional literature lookup soft-failed (service unavailable). Graph grounding above is still local — Gate C cites were not refreshed from the server.",
            );
          }
          return;
        }
        const data = (await res.json()) as {
          grounding?: AskGrounding;
          provisionalError?: string | null;
          provisionalSkipped?: string | null;
        };
        if (data.grounding) setGrounding(data.grounding);
        const note = data.provisionalError || data.provisionalSkipped;
        if (note) setProvisionalNote(note);
        else if (
          data.grounding &&
          shouldFetchProvisionalLit(data.grounding, data.grounding.queryClass) &&
          !(data.grounding.provisionalLiterature?.length)
        ) {
          setProvisionalNote(
            "Provisional PubMed/Europe PMC returned no hits for this question — soft-fail / empty search, not Gate C coverage.",
          );
        }
      } catch {
        const want = shouldFetchProvisionalLit(prepared.grounding, prepared.queryClass);
        if (want) {
          setProvisionalNote(
            "Provisional literature lookup could not be reached. Local graph grounding is shown; do not invent PMIDs.",
          );
        }
      }
    })();
    sendMessage({ text: t });
  };

  const runAction = (action: ExplanationAction) => {
    if (!grounding) return;
    setLocalNote(runExplanationAction(action, grounding));
  };

  const renderLink = ({ href, children }: { href?: string | undefined; children?: ReactNode }) => {
    if (href?.startsWith("concept:")) {
      const id = href.slice(8);
      const n = byId[id];
      if (!n) return <span>{children}</span>;
      return (
        <span className="ask-concept-wrap">
          <button type="button" className="ask-concept" onClick={() => inspect({ kind: "concept", id })} title={`Inspect ${n.name}`}>
            <span className="dot" style={{ background: `var(${TYPES[n.node_type].c})` }} />{children}
          </button>
          <Link to="/atlas/$id" params={{ id }} className="ask-concept-page" aria-label={`Open ${n.name} concept page`} title="Concept page">
            <ArrowUpRight size={11} />
          </Link>
          <Link to="/graph" search={{ focus: id }} className="ask-concept-page" aria-label={`Highlight ${n.name} in the graph`} title="Graph">
            <span className="ask-route-hint">graph</span>
          </Link>
        </span>
      );
    }
    if (href?.startsWith("edge:")) {
      const raw = href.slice(5);
      const [s = "", o = ""] = raw.split(":");
      const e = edgeByRel[raw] ?? findEdge(s, o);
      if (!e) return <span>{children}</span>;
      const focusId = e.subject_id;
      return (
        <span className="ask-concept-wrap">
          <button type="button" className="ask-edge" onClick={() => inspect({ kind: "relationship", id: relId(e) })} title="Inspect this connection">
            {children} →
          </button>
          <Link to="/graph" search={{ focus: focusId }} className="ask-concept-page" aria-label="Open this pathway in the graph" title="Graph">
            <ArrowUpRight size={11} />
          </Link>
        </span>
      );
    }
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const statusLabel =
    status === "submitted" ? "Retrieving graph context…"
      : status === "streaming" ? "Writing from retrieved graph context…"
        : null;

  return (
    <div className={`ask-atlas card${showFullPageLink ? " ask-atlas--corner" : " ask-atlas--page"}`}>
      <div className="ask-head">
        <span className="ask-id" aria-hidden><Microscope size={18} /></span>
        <div>
          <div className="ask-head-row">
            <h3>{ASK_NAME}</h3>
            <span className="ask-capability" title="capabilityStatus · ask-atlas">{CAPABILITY_STATUS_LABEL.partial}</span>
            <span className="ask-head-actions">
              {showFullPageLink ? <Link to="/ask" className="ask-mini-btn"><Maximize2 size={13} /> Open full page</Link> : null}
              {messages.length ? <button type="button" className="ask-mini-btn" onClick={newConversation} disabled={busy}>New conversation</button> : null}
            </span>
          </div>
          <p className="xs muted ask-tagline">
            Graph-retrieved teaching · Gate C reviewed cites when present · provisional PubMed/Europe PMC labelled unreviewed · not fully evidence-grounded AI
          </p>
          <p className="xs muted">
            Educational — not patient-specific advice or CDS. Questions go to the configured AI service; see our{" "}
            <Link to="/privacy">privacy notice</Link>.
          </p>
        </div>
      </div>
      <div className="ask-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="ask-empty" role="region" aria-label={`${ASK_NAME} starters`}>
            <p className="ask-empty-lead">
              Ask about a cell, pathway, cytokine, disease or therapy in the curated graph.
              Answers show grounding tiers separately — reviewed cites, provisional literature, and missing support are never conflated.
            </p>
            {groupedSuggestions ? (
              <div className="ask-suggest-groups">
                {groupedSuggestions.map((g) => (
                  <div key={g.label} className="ask-suggest-group">
                    <span className="ask-insp-label">{g.label}</span>
                    {g.items.map((q) => (
                      <button key={q} type="button" className="chip" onClick={() => send(q)} disabled={busy}>{q}</button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="ask-suggestions">
                <span className="ask-insp-label">Try a starter</span>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>
                ))}
              </div>
            )}
          </div>
        ) : null}
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const fu = m === lastAssistant && !busy ? followUps(conceptsIn(text), asked) : [];
          return (
            <div key={m.id} className={`ask-msg ${m.role}`}>
              <span className="ask-role">{m.role === "user" ? "You" : ASK_NAME}</span>
              <div className="ask-body">
                {m.role === "assistant" ? (
                  <>
                    <div className="ask-ai-badge" role="note">
                      AI-generated · graph-retrieved · {CAPABILITY_STATUS_LABEL.partial.toLowerCase()} · not patient-specific advice
                    </div>
                    <ReactMarkdown urlTransform={(u) => u} components={{ a: renderLink }}>{text}</ReactMarkdown>
                    {!busy || m !== lastAssistant ? (
                      <button type="button" className="ask-mini-btn" onClick={() => copyText(m.id, text)} aria-label="Copy answer">
                        <Copy size={12} /> {copied === m.id ? "Copied" : "Copy answer"}
                      </button>
                    ) : null}
                  </>
                ) : <p>{text}</p>}
                {m === lastAssistant && grounding ? (
                  <>
                    <GroundingPanel grounding={grounding} provisionalNote={provisionalNote} />
                    {grounding.coverage.matched && !grounding.trace.abstained ? (
                      <div className="ask-followups" aria-label="Explanation actions">
                        <span className="ask-insp-label">Inspect without regenerating</span>
                        {EXPLAIN_ACTIONS.map((a) => (
                          <button key={a.id} type="button" className="chip" onClick={() => runAction(a.id)}>{a.label}</button>
                        ))}
                      </div>
                    ) : null}
                    {localNote && m === lastAssistant ? (
                      <pre className="ask-local-note xs">{localNote}</pre>
                    ) : null}
                  </>
                ) : null}
                {m === lastAssistant && !busy ? (() => {
                  const lastUser = [...messages].reverse().find((x) => x.role === "user");
                  const q = lastUser ? lastUser.parts.map((p) => (p.type === "text" ? p.text : "")).join("").slice(0, 200) : "";
                  return q ? (
                    <p className="xs muted">
                      Look for literature:{" "}
                      <Link to="/research" search={{ lib: q }} hash="library">search journal metadata (Crossref)</Link>{" "}
                      (source records only — not reviewed evidence; no Nature Portfolio affiliation).
                    </p>
                  ) : null;
                })() : null}
                {fu.length > 0 && (
                  <div className="ask-followups" aria-label="Suggested follow-ups">
                    <span className="ask-insp-label">Ask next</span>
                    {fu.map((q) => (
                      <button key={q} type="button" className="chip" onClick={() => send(q)}>
                        <CornerDownRight size={12} /> {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {statusLabel ? (
          <div className="ask-msg assistant" aria-live="polite">
            <span className="ask-role">{ASK_NAME}</span>
            <div className="ask-body">
              <p className="muted ask-loading">{statusLabel}</p>
              {grounding && status === "submitted" ? (
                <GroundingPanel grounding={grounding} provisionalNote={provisionalNote} />
              ) : null}
            </div>
          </div>
        ) : null}
        {error ? (
          <div className="ask-msg assistant" role="alert">
            <span className="ask-role">{ASK_NAME}</span>
            <div className="ask-body">
              <p className="muted">
                {/429|Too many/.test(error.message)
                  ? "You've asked a lot of questions quickly — please wait a minute."
                  : "Sorry — the answer could not be generated. Graph exploration and Methods & trust remain available."}
              </p>
              {!/429|Too many/.test(error.message) ? (
                <button type="button" className="ask-mini-btn" onClick={() => regenerate()}>
                  <RotateCcw size={12} /> Retry
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {matches.length > 0 && (
        <div className="ask-quick-matches" aria-label="Matching concepts">
          {matches.map((n) => (
            <Button
              variant="ghost"
              key={n.id}
              onClick={() => { setPick({ kind: "concept", id: n.id }); setInput(""); }}
            >
              <span>{n.name}</span>
              <small>{TYPES[n.node_type].label}</small>
              <ArrowUpRight size={14} />
            </Button>
          ))}
        </div>
      )}
      <form className="ask-composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea
          maxLength={500}
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Ask about a cell, pathway, drug or connection…"
          rows={2}
          aria-label={`${ASK_NAME} question`}
        />
        {busy ? (
          <button type="button" className="btn sm" onClick={stop} aria-label="Stop generating"><Square size={14} /> Stop</button>
        ) : (
          <button type="submit" className="btn sm primary" disabled={!input.trim()} aria-label="Send question"><Send size={14} /> Ask</button>
        )}
      </form>
      {pick ? <Inspector pick={pick} onClose={() => setPick(null)} /> : null}
    </div>
  );
}
