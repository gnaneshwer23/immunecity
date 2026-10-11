import { useQuery } from "@tanstack/react-query";
import { edgeRef, relId, type KGEdge } from "@/lib/immune/engine";
import { inspect } from "@/lib/immune/inspector";
import { StatusBadge } from "./ScientificInspector";
import { approvedQuery, type ApprovedCitation } from "@/lib/citations.functions";

const LEVEL: Record<string, string> = {
  ESTABLISHED: "established", "EVIDENCE-SUPPORTED": "evidence-supported", EMERGING: "emerging", HYPOTHESIS: "hypothesis",
};

export function useApproved(nodeId: string | undefined): ApprovedCitation[] {
  const { data } = useQuery(approvedQuery);
  return nodeId && data ? data.filter((c) => c.node_id === nodeId && !c.relationship_id) : [];
}

export default function EdgeReference({ edge }: { edge: KGEdge }) {
  const ref = edgeRef(edge);
  const { data, isError } = useQuery(approvedQuery);
  const approved = data?.find((c) => c.relationship_id === relId(edge));
  const level = LEVEL[edge.evidence_status] ?? edge.evidence_status?.toLowerCase();
  return (
    <span className="edge-ref-wrap">
      {ref ? (
        <span className="edge-ref">
          <a href={ref.url} target="_blank" rel="noreferrer">{ref.label}</a>
          {ref.kind === "citation" ? <span className="badge ev-chk-missing" title="Hand-written reference, not yet matched to a PubMed ID or DOI">unverified</span> : null}
        </span>
      ) : isError ? (
        <span className="edge-ref needs" title="Evidence database query failed">evidence service unavailable</span>
      ) : approved ? (
        <span className="edge-ref">
          <a href={approved.url} target="_blank" rel="noreferrer">{approved.label}</a>
          <span className="badge ev-chk-match" title="Approved source mapped to this exact link">curated</span>
        </span>
      ) : (
        <span className="edge-ref needs">citation pending curation</span>
      )}
      <StatusBadge edge={edge} />
      <button type="button" className="si-open" onClick={() => inspect({ kind: "relationship", id: relId(edge) })} aria-label="Open scientific detail for this link">details</button>
      {level ? <span className={`badge lvl-${edge.evidence_status}`}>{level}</span> : null}
      {edge.draft ? <span className="badge ev-chk-missing" title="Added to close a coverage gap; needs expert review">draft</span> : null}
    </span>
  );
}

export function NodeCitations({ id }: { id: string }) {
  const list = useApproved(id);
  if (!list.length) return null;
  return (
    <div className="small" style={{ marginTop: 8 }}>
      <span className="xs mono muted">CURATED SOURCES · </span>
      {list.map((c) => <a key={c.evidence_id} href={c.url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{c.label}</a>)}
    </div>
  );
}
