import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";
import { Send, Square, Microscope, X, ArrowUpRight, CornerDownRight } from "lucide-react";
import { byId, out, inn, human, TYPES, edgeByRel, relId, type KGEdge } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import { prepareAsk, runExplanationAction, type AskGrounding, type ExplanationAction } from "@/lib/askGrounding";
import EdgeReference, { NodeCitations } from "./EdgeReference";
import GroundingPanel from "./GroundingPanel";
import { Button } from "@/components/ui/button";
import { KG } from "@/lib/immune/engine";

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
  // A neighbour not yet mentioned
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
        <Link className="btn sm primary" to="/graph" search={{ focus: n.id }}>Highlight in graph <ArrowUpRight size={14} /></Link>
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
        <Link className="btn sm primary" to="/graph" search={{ focus: e.subject_id }}>Highlight in graph <ArrowUpRight size={14} /></Link>
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

export default function AskAtlas() {
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ask" }),
  });
  const [input, setInput] = useState("");
  const [pick, setPick] = useState<Pick | null>(null);
  const [grounding, setGrounding] = useState<AskGrounding | null>(null);
  const [localNote, setLocalNote] = useState<string | null>(null);
  const busy = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const matches = useMemo(() => {
    const query = input.trim().toLowerCase();
    if (query.length < 2) return [];
    return KG.nodes.filter((n) => n.name.toLowerCase().includes(query) || n.id.toLowerCase() === query).slice(0, 5);
  }, [input]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status, grounding, localNote]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const asked = useMemo(() => new Set(messages.filter((m) => m.role === "user").flatMap((m) => m.parts.map((p) => (p.type === "text" ? p.text : "")))), [messages]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const prepared = prepareAsk(t);
    setGrounding(prepared.grounding);
    setLocalNote(null);
    setInput("");
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
        <button type="button" className="ask-concept" onClick={() => inspect({ kind: "concept", id })} title={`Inspect ${n.name}`}>
          <span className="dot" style={{ background: `var(${TYPES[n.node_type].c})` }} />{children}
        </button>
      );
    }
    if (href?.startsWith("edge:")) {
      const raw = href.slice(5);
      const [s = "", o = ""] = raw.split(":");
      const e = edgeByRel[raw] ?? findEdge(s, o);
      if (!e) return <span>{children}</span>;
      return <button type="button" className="ask-edge" onClick={() => inspect({ kind: "relationship", id: relId(e) })} title="Inspect this connection">{children} →</button>;
    }
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="ask-atlas card">
      <div className="ask-head">
        <span className="ask-id" aria-hidden><Microscope size={18} /></span>
        <div>
          <h3>Ask Immune City</h3>
          <p className="xs muted">Graph-retrieved immunology copilot · educational beta · not fully evidence-grounded AI</p>
          <p className="xs muted">Answers use retrieved graph concepts, links, and reviewed relationship cites when they exist (sparse overall). Not medical advice or CDS. Nothing is stored.</p>
        </div>
      </div>
      <div className="ask-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="ask-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        ) : null}
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const fu = m === lastAssistant && !busy ? followUps(conceptsIn(text), asked) : [];
          return (
            <div key={m.id} className={`ask-msg ${m.role}`}>
              <span className="ask-role">{m.role === "user" ? "You" : "Atlas"}</span>
              <div className="ask-body">
                {m.role === "assistant" ? (
                  <>
                    <div className="ask-ai-badge" role="note">AI-generated · graph-retrieved · not clinical advice</div>
                    <ReactMarkdown urlTransform={(u) => u} components={{ a: renderLink }}>{text}</ReactMarkdown>
                  </>
                ) : <p>{text}</p>}
                {m === lastAssistant && grounding ? (
                  <>
                    <GroundingPanel grounding={grounding} />
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
                {fu.length > 0 && (
                  <div className="ask-followups">
                    <span className="ask-insp-label">Explore next</span>
                    {fu.map((q) => (
                      <button key={q} className="chip" onClick={() => send(q)}><CornerDownRight size={12} /> {q}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {status === "submitted" ? (
          <div className="ask-msg assistant">
            <span className="ask-role">Atlas</span>
            <div className="ask-body">
              <p className="muted">Retrieving graph evidence…</p>
              {grounding ? <GroundingPanel grounding={grounding} /> : null}
            </div>
          </div>
        ) : null}
        {error ? <div className="ask-msg assistant"><span className="ask-role">Atlas</span><div className="ask-body"><p className="muted">{/429|Too many/.test(error.message) ? "You've asked a lot of questions quickly — please wait a minute." : "Sorry — the answer could not be generated. Please try again."}</p></div></div> : null}
      </div>
      {matches.length > 0 && (
        <div className="ask-quick-matches" aria-label="Matching concepts">
          {matches.map((n) => (
            <Button variant="ghost" key={n.id} onClick={() => { setPick({ kind: "concept", id: n.id }); setInput(""); }}>
              <span>{n.name}</span><small>{TYPES[n.node_type].label}</small><ArrowUpRight size={14} />
            </Button>
          ))}
        </div>
      )}
      <form className="ask-composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea maxLength={500}
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Ask about a cell, pathway, drug or connection…"
          rows={2}
          aria-label="Ask the atlas a question"
        />
        {busy ? (
          <button type="button" className="btn sm" onClick={stop} aria-label="Stop generating"><Square size={14} /> Stop</button>
        ) : (
          <button type="submit" className="btn sm primary" disabled={!input.trim()} aria-label="Send question"><Send size={14} /> Ask</button>
        )}
      </form>
    </div>
  );
}
