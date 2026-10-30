/**
 * Collapsible expert / technical panel — provenance and eng identifiers stay here,
 * not in primary researcher copy.
 */
import type { ReactNode } from "react";

export default function ExpertDetails({
  summary = "Technical details",
  children,
  testId = "expert-panel",
  className,
}: {
  summary?: string;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <details className={`isi-expert-details${className ? ` ${className}` : ""}`} data-testid={testId}>
      <summary>{summary}</summary>
      <div className="isi-expert-body">{children}</div>
    </details>
  );
}
