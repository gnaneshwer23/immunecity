/** Stylized immune-cell avatar for Ask voice input / spoken answers. */
export function ImmuneCellSpeaker({
  active = false,
  speaking = false,
  size = 28,
  title = "Immune cell speaker",
}: {
  active?: boolean;
  speaking?: boolean;
  size?: number;
  title?: string;
}) {
  const pulse = active || speaking;
  return (
    <svg
      className={`ask-cell-speaker${pulse ? " ask-cell-speaker--live" : ""}${speaking ? " ask-cell-speaker--speak" : ""}${active ? " ask-cell-speaker--listen" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <title>{title}</title>
      {/* Membrane */}
      <circle cx="20" cy="20" r="15.5" fill="currentColor" opacity="0.12" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {/* Multi-lobed nucleus (neutrophil-like) */}
      <ellipse cx="14.5" cy="17" rx="4.2" ry="5.2" fill="currentColor" opacity="0.55" />
      <ellipse cx="20.5" cy="22.5" rx="4.6" ry="5" fill="currentColor" opacity="0.55" />
      <ellipse cx="26" cy="16.5" rx="3.8" ry="4.6" fill="currentColor" opacity="0.55" />
      {/* Granules */}
      <circle cx="12" cy="26" r="1.3" fill="currentColor" opacity="0.35" />
      <circle cx="28" cy="25" r="1.1" fill="currentColor" opacity="0.35" />
      <circle cx="18" cy="12" r="1" fill="currentColor" opacity="0.3" />
      {/* Sound / listen cue */}
      {speaking ? (
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85">
          <path d="M33 14c2 2.2 2 9.8 0 12" />
          <path d="M35.5 11.5c3.2 3.2 3.2 13.8 0 17" />
        </g>
      ) : null}
      {active ? (
        <g fill="currentColor" opacity="0.7">
          <circle cx="34" cy="12" r="1.4" />
          <circle cx="36.5" cy="20" r="1.2" />
          <circle cx="34" cy="28" r="1.4" />
        </g>
      ) : null}
    </svg>
  );
}
