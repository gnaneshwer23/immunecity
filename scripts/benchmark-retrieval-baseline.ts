#!/usr/bin/env bun
/**
 * Hybrid retrieval baseline harness (ISI-007 / Layer D).
 *
 * Measures current lexical + graph retrieval only. Does NOT add a vector DB.
 * Decision: keep graph+lexical until this baseline shows a measured gap that dense retrieval would close.
 *
 * Usage: bun scripts/benchmark-retrieval-baseline.ts
 * Output: JSON summary to stdout (no fabricated competitor scores).
 */

import { classifyAskQuery, graphContext, relevantNodes } from "../src/lib/askGrounding";
import { SCIENTIFIC_EVAL_SET } from "../src/test/eval/scientific-eval-set";

type CaseResult = {
  id: string;
  kind: string;
  question: string;
  queryClass: string;
  retrievedNodeCount: number;
  retrievedRelCount: number;
  mustHitRecall: number | null;
  chainCount: number;
  reviewedEvidenceCount: number;
  counterEvidenceCount: number;
  ms: number;
};

function mustIds(c: (typeof SCIENTIFIC_EVAL_SET)[number]): string[] | null {
  if (c.kind === "path" || c.kind === "multi-concept") return c.mustRetrieveNodeIds;
  return null;
}

function runCase(c: (typeof SCIENTIFIC_EVAL_SET)[number]): CaseResult | null {
  if (c.kind === "mechanism" || c.kind === "exemplar" || c.kind === "citation-validation") return null;
  const question = "question" in c ? c.question : "";
  if (!question) return null;
  const t0 = performance.now();
  const queryClass = classifyAskQuery(question);
  const nodes = relevantNodes(question);
  const g = graphContext(question, queryClass);
  const ms = performance.now() - t0;
  const must = mustIds(c);
  let mustHitRecall: number | null = null;
  if (must?.length) {
    const got = new Set(nodes.map((n) => n.id));
    const hits = must.filter((id) => got.has(id)).length;
    mustHitRecall = hits / must.length;
  }
  return {
    id: c.id,
    kind: c.kind,
    question,
    queryClass,
    retrievedNodeCount: g.nodeIds.length,
    retrievedRelCount: g.relIds.length,
    mustHitRecall,
    chainCount: g.chains.length,
    reviewedEvidenceCount: g.coverage.reviewedEvidenceCount,
    counterEvidenceCount: g.coverage.counterEvidenceCount,
    ms: Math.round(ms * 100) / 100,
  };
}

const results = SCIENTIFIC_EVAL_SET.map(runCase).filter((r): r is CaseResult => !!r);
const withMust = results.filter((r) => r.mustHitRecall !== null);
const meanRecall =
  withMust.length === 0 ? null : withMust.reduce((s, r) => s + (r.mustHitRecall ?? 0), 0) / withMust.length;
const meanMs = results.length ? results.reduce((s, r) => s + r.ms, 0) / results.length : 0;

const summary = {
  harness: "isi-hybrid-retrieval-baseline-v1",
  status: "baseline_only",
  vectorDb: "not_added",
  decision:
    "No vector/graph DB until a follow-up dense run beats mean must-hit recall / latency on the same case set with documented cost.",
  measuredAt: new Date().toISOString(),
  caseCount: results.length,
  meanMustHitRecall: meanRecall === null ? null : Math.round(meanRecall * 1000) / 1000,
  meanLatencyMs: Math.round(meanMs * 100) / 100,
  notes: [
    "Retrieval = relevantNodes + graphContext (lexical/alias + typed graph). No BM25 index, no embeddings.",
    "Gate C reviewedEvidenceCount is usually 0 in offline harness (no Neon) — expected.",
    "Do not compare these numbers to OpenScholar without the same corpus and protocol.",
  ],
  cases: results,
};

console.log(JSON.stringify(summary, null, 2));
