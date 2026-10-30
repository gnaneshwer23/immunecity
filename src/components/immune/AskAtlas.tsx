import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";
import { Send, Square, Mic, Volume2, VolumeX, X, ArrowUpRight, CornerDownRight, Copy, RotateCcw, Maximize2, Info } from "lucide-react";
import type { UIMessage } from "ai";
import { byId, out, inn, human, TYPES, edgeByRel, relId, type KGEdge } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import { ASK_NAME } from "@/lib/brand";
import { CAPABILITY_STATUS_LABEL } from "@/data/capabilityStatus";
import {
  askProgressLabel,
  classifyAskGatewayIntent,
  hideGraphScorePhrases,
  matchConceptSuggestions,
  prepareAsk,
  runExplanationAction,
  shouldFetchProvisionalLit,
  suggestGatewayActions,
  type AskGrounding,
  type ExplanationAction,
} from "@/lib/askGrounding";
import EdgeReference, { NodeCitations } from "./EdgeReference";
import GroundingPanel from "./GroundingPanel";
import { ImmuneCellSpeaker } from "./ImmuneCellSpeaker";
import { Button } from "@/components/ui/button";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: {
    results: { length: number; [i: number]: { 0: { transcript: string }; isFinal: boolean } };
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickImmuneCellVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefer = [/samantha/i, /karen/i, /moira/i, /google uk english female/i, /english.*female/i, /en-gb/i, /en-us/i];
  for (const re of prefer) {
    const hit = voices.find((v) => re.test(v.name) || re.test(v.lang));
    if (hit) return hit;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
}

/** Strip markdown / graph link noise for spoken answers. */
function speakableText(raw: string): string {
  return hideGraphScorePhrases(raw)
    .replace(/\]\((concept|edge):[^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

const SUGGESTIONS = [
  "What is the immune system?",
  "How does TNF drive rheumatoid arthritis?",
  "What connects the gut microbiome to inflammation?",
  "How do checkpoint inhibitors help T cells?",
];

const EXPLAIN_ACTIONS: { id: ExplanationAction; label: string }[] = [
  { id: "explain_mechanism", label: "Explain mechanism" },
  { id: "show_path", label: "Show path" },
  { id: "what_evidence_missing", label: "What evidence is missing?" },
  { id: "what_would_change", label: "What would change this?" },
  { id: "show_counterevidence", label: "Show counterevidence" },
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
        <p className="xs muted">Evidence: {e.evidence_status || "unspecified"}{e.location ? ` · Tissue: ${e.location}` : ""}</p>
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
  const [howOpen, setHowOpen] = useState(false);
  const howId = useId();
  const { messages, sendMessage, status, stop, error, setMessages, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ask" }),
  });
  const [input, setInput] = useState(initialInput);
  const [restored, setRestored] = useState(!persistKey);
  const [copied, setCopied] = useState<string | null>(null);
  const [provisionalNote, setProvisionalNote] = useState<string | null>(null);
  const [researchTraceText, setResearchTraceText] = useState<string | null>(null);
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
    setResearchTraceText(null);
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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [speechReady, setSpeechReady] = useState({ mic: false, speak: false });
  const matches = useMemo(() => {
    if (input.trim().length < 2) return [];
    return matchConceptSuggestions(input, 5);
  }, [input]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status, grounding, localNote, provisionalNote]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const mic = !!getSpeechRecognitionCtor();
    const speak = typeof window !== "undefined" && "speechSynthesis" in window;
    setSpeechReady({ mic, speak });
    if (!speak) return;
    const warm = () => { pickImmuneCellVoice(); };
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", warm);
      window.speechSynthesis.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingId(null);
  };

  const speakAnswer = (id: string, text: string) => {
    if (!speechReady.speak) {
      setVoiceNote("Spoken answers need a browser that supports speech synthesis.");
      return;
    }
    const clean = speakableText(text);
    if (!clean) return;
    stopSpeaking();
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1;
    u.pitch = 1.05;
    const voice = pickImmuneCellVoice();
    if (voice) u.voice = voice;
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    setVoiceNote(null);
    window.speechSynthesis.speak(u);
  };

  const toggleListen = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceNote("Voice commands need a browser that supports speech recognition (try Chrome or Edge).");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    stopSpeaking();
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const row = ev.results[i];
        if (!row) continue;
        if (row.isFinal) final += row[0].transcript;
        else interim += row[0].transcript;
      }
      const next = (final || interim).trim();
      if (next) setInput(next);
      if (final.trim()) {
        setListening(false);
        setVoiceNote(null);
      }
    };
    rec.onerror = () => {
      setListening(false);
      setVoiceNote("Could not hear that — try again, or type your question.");
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
      setVoiceNote(null);
    } catch {
      setListening(false);
      setVoiceNote("Microphone unavailable — check browser permissions.");
    }
  };

  const callModelCache = useRef(new Map<string, boolean>());
  const willCallModel = (q: string) => {
    let v = callModelCache.current.get(q);
    if (v === undefined) {
      v = prepareAsk(q).callModel;
      callModelCache.current.set(q, v);
    }
    return v;
  };

  const asked = useMemo(
    () => new Set(messages.filter((m) => m.role === "user").flatMap((m) => m.parts.map((p) => (p.type === "text" ? p.text : "")))),
    [messages],
  );

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const prepared = prepareAsk(t);
    callModelCache.current.set(t, prepared.callModel);
    setGrounding(prepared.grounding);
    setResearchTraceText(null);
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
              "The reviewed-source and literature lookup for this panel was unavailable, so the counts below may be incomplete.",
            );
          }
          return;
        }
        const data = (await res.json()) as {
          grounding?: AskGrounding;
          provisionalError?: string | null;
          provisionalSkipped?: string | null;
          researchTraceText?: string | null;
        };
        if (data.grounding) setGrounding(data.grounding);
        if (data.researchTraceText) setResearchTraceText(data.researchTraceText);
        const note = data.provisionalError || data.provisionalSkipped;
        if (note) setProvisionalNote(note);
        else if (
          data.grounding &&
          shouldFetchProvisionalLit(data.grounding, data.grounding.queryClass) &&
          !(data.grounding.provisionalLiterature?.length)
        ) {
          setProvisionalNote(
            "The literature search found no papers for this question. That is not a claim that no research exists.",
          );
        }
      } catch {
        const want = shouldFetchProvisionalLit(prepared.grounding, prepared.queryClass);
        if (want) {
          setProvisionalNote(
            "The reviewed-source and literature lookup for this panel could not be reached, so the counts below may be incomplete.",
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
  const lastUserForProgress = [...messages].reverse().find((x) => x.role === "user");
  const progressQ = lastUserForProgress?.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim() ?? "";
  const progressIntent = progressQ ? classifyAskGatewayIntent(progressQ, grounding?.queryClass) : undefined;
  const statusLabel =
    status === "submitted"
      ? askProgressLabel(grounding ? "reviewing" : "retrieving", progressIntent)
      : status === "streaming"
        ? askProgressLabel("writing", progressIntent)
        : null;

  return (
    <div className={`ask-atlas card${showFullPageLink ? " ask-atlas--corner" : " ask-atlas--page"}`}>
      <div className="ask-head">
        <span className="ask-id ask-id--cell" aria-hidden>
          <ImmuneCellSpeaker active={listening} speaking={!!speakingId} size={28} title="" />
        </span>
        <div className="ask-head-main">
          <div className="ask-head-row">
            <h3>{ASK_NAME}</h3>
            <button
              type="button"
              className="ask-capability"
              aria-expanded={howOpen}
              aria-controls={howId}
              onClick={() => setHowOpen((o) => !o)}
              title="How answers work"
            >
              <Info size={12} aria-hidden /> Evidence: {CAPABILITY_STATUS_LABEL.partial.toLowerCase()}
            </button>
            <span className="ask-head-actions">
              {showFullPageLink ? <Link to="/ask" className="ask-mini-btn"><Maximize2 size={13} /> Continue in Ask Immune</Link> : null}
              {messages.length ? <button type="button" className="ask-mini-btn" onClick={newConversation} disabled={busy}>New chat</button> : null}
            </span>
          </div>
          <p className="ask-tagline">
            Your immunology chatbot — ask by typing or voice. The immune-cell speaker can read answers aloud.
          </p>
          {howOpen ? (
            <div className="ask-how" id={howId}>
              <b>How answers work</b>
              <ul>
                <li>Answers are built from the site’s curated knowledge graph, not the open web.</li>
                <li>Sources an expert has checked for that exact claim are marked <i>reviewed</i>; literature search hits are marked <i>unreviewed</i>.</li>
                <li><b>Why “partial”:</b> most links in the graph are still awaiting expert claim review, so many answers are teaching explanations rather than verified evidence. <Link to="/methods" hash="live-ev-heading">See live coverage</Link>.</li>
                <li>Questions are sent to our AI provider to write the answer — see the <Link to="/privacy">privacy notice</Link>.</li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <div className="ask-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="ask-empty" role="region" aria-label={`${ASK_NAME} starters`}>
            <p className="ask-empty-lead">
              Ask anything from the basics to a specific mechanism — a cell, cytokine, pathway, disease or therapy.
              Each answer links the concepts it uses and shows how well each step is supported.
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
                <span className="ask-insp-label">Try asking</span>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>
                ))}
              </div>
            )}
          </div>
        ) : null}
        {messages.map((m, i) => {
          const rawText = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const text = m.role === "assistant" ? hideGraphScorePhrases(rawText) : rawText;
          const prevUser = [...messages.slice(0, i)].reverse().find((x) => x.role === "user");
          const prevUserText = prevUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim() ?? "";
          // Same deterministic routing as the server: refusals and no-match replies never call the model.
          const noModel = m.role === "assistant" && !!prevUserText && !willCallModel(prevUserText);
          const fu = m === lastAssistant && !busy ? followUps(conceptsIn(text), asked) : [];
          return (
            <div key={m.id} className={`ask-msg ${m.role}`}>
              <span className="ask-role">{m.role === "user" ? "You" : ASK_NAME}</span>
              <div className="ask-body">
                {m.role === "assistant" ? (
                  <>
                    <div className="ask-ai-badge" role="note">
                      {noModel
                        ? "Fixed response — no AI answer generated · not medical advice"
                        : `AI-written from the knowledge graph · evidence ${CAPABILITY_STATUS_LABEL.partial.toLowerCase()} · not medical advice`}
                    </div>
                    <ReactMarkdown urlTransform={(u) => u} components={{ a: renderLink }}>{text}</ReactMarkdown>
                    {!busy || m !== lastAssistant ? (
                      <span className="ask-msg-actions">
                        <button type="button" className="ask-mini-btn" onClick={() => copyText(m.id, text)} aria-label="Copy answer">
                          <Copy size={12} /> {copied === m.id ? "Copied" : "Copy answer"}
                        </button>
                        {speechReady.speak ? (
                          <button
                            type="button"
                            className={`ask-mini-btn ask-speak-btn${speakingId === m.id ? " is-live" : ""}`}
                            onClick={() => (speakingId === m.id ? stopSpeaking() : speakAnswer(m.id, text))}
                            aria-label={speakingId === m.id ? "Stop immune cell speaker" : "Hear answer from immune cell speaker"}
                            title="Immune cell speaker"
                          >
                            <ImmuneCellSpeaker speaking={speakingId === m.id} size={16} title="" />
                            {speakingId === m.id ? <><VolumeX size={12} /> Stop</> : <><Volume2 size={12} /> Hear</>}
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </>
                ) : <p>{text}</p>}
                {m === lastAssistant && grounding ? (
                  <>
                    <GroundingPanel grounding={grounding} provisionalNote={provisionalNote} />
                    {researchTraceText ? (
                      <details className="ask-research-trace">
                        <summary className="xs">Investigate plan trace (partial — not a multi-agent system)</summary>
                        <pre className="ask-local-note xs">{researchTraceText}</pre>
                      </details>
                    ) : null}
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
                  const primaryId = grounding?.nodeIds.find((id) => byId[id]) ?? conceptsIn(text)[0];
                  const primary = primaryId ? byId[primaryId] : undefined;
                  const gatewayActions =
                    grounding?.coverage.matched && !grounding.trace.abstained
                      ? suggestGatewayActions(grounding, q)
                      : [];
                  return (
                    <>
                      {gatewayActions.length ? (
                        <div className="ask-followups ask-build-links" aria-label="Continue investigating">
                          <span className="ask-insp-label">Open next — chat context kept via Ask</span>
                          {gatewayActions.map((a) => (
                            <a key={a.id} className="chip" href={a.href}>
                              {a.label} <ArrowUpRight size={12} />
                            </a>
                          ))}
                        </div>
                      ) : q ? (
                        <p className="xs muted">
                          Look for literature:{" "}
                          <Link to="/research" search={{ lib: q }} hash="library">search journal metadata (Crossref)</Link>{" "}
                          (source records only — not reviewed evidence; no Nature Portfolio affiliation).
                        </p>
                      ) : null}
                      {primary && grounding?.coverage.matched ? (
                        <details className="ask-research-trace">
                          <summary className="xs">How this answer was routed (optional)</summary>
                          <p className="xs muted">
                            Surface focus: {classifyAskGatewayIntent(q, grounding.queryClass).replace(/_/g, " ")}.
                            Follow-up links open Explore, Research, Academy or Methods — they do not run additional
                            agents. Discovery Intel remains educational scaffolding until each path is evaluated.
                          </p>
                        </details>
                      ) : null}
                    </>
                  );
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
        <button
          type="button"
          className={`ask-voice-btn${listening ? " is-live" : ""}`}
          onClick={toggleListen}
          disabled={busy}
          aria-pressed={listening}
          aria-label={listening ? "Stop voice command" : "Voice command with immune cell speaker"}
          title={speechReady.mic ? "Voice command" : "Voice command not supported in this browser"}
        >
          <ImmuneCellSpeaker active={listening} size={22} title="" />
          <Mic size={14} aria-hidden />
          <span className="ask-voice-label">{listening ? "Listening…" : "Voice"}</span>
        </button>
        <textarea
          maxLength={500}
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={listening ? "Listening for your question…" : "Ask about a cell, pathway, drug or connection…"}
          rows={2}
          aria-label={`${ASK_NAME} question`}
        />
        {busy ? (
          <button type="button" className="btn sm" onClick={stop} aria-label="Stop generating"><Square size={14} /> Stop</button>
        ) : (
          <button type="submit" className="btn sm primary" disabled={!input.trim()} aria-label="Send question"><Send size={14} /> Ask</button>
        )}
      </form>
      {voiceNote ? <p className="ask-voice-note" role="status">{voiceNote}</p> : null}
      <p className="ask-foot-note">Educational only — not medical advice or clinical decision support. Voice stays in your browser.</p>
      {pick ? <Inspector pick={pick} onClose={() => setPick(null)} /> : null}
    </div>
  );
}
