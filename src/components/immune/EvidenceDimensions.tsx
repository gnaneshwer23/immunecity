/* Three orthogonal evidence dimensions — never one confidence score. */
import type { EvidenceDimension } from "@/lib/immune/evidenceDimensions";

export function EvidenceDimensionsStrip({
  dims,
  compact = false,
  testId,
}: {
  dims: EvidenceDimension[];
  compact?: boolean;
  testId?: string;
}) {
  return (
    <dl
      className={compact ? "isi-ev-dims isi-ev-dims-compact" : "isi-ev-dims"}
      data-testid={testId ?? "evidence-dimensions"}
      aria-label="Evidence dimensions — curation, evidence status, and recorded quality are separate"
    >
      {dims.map((d) => (
        <div key={d.kind} className="isi-ev-dim" data-kind={d.kind}>
          <dt>{d.axis}</dt>
          <dd>
            <span className={`badge isi-ev-dim-badge isi-ev-dim-${d.kind}`} title={d.description}>
              {d.value}
            </span>
            {!compact ? <span className="xs muted isi-ev-dim-desc">{d.description}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
