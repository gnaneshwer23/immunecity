/** Stylized immune-cell mascot for Ask voice input / spoken answers. */
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
  const live = active || speaking;
  const className = [
    "ask-cell-speaker",
    live ? "ask-cell-speaker--live" : "",
    active ? "ask-cell-speaker--listen" : "",
    speaking ? "ask-cell-speaker--speak" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
    >
      {title ? <title>{title}</title> : null}

      {/* Antennae / receptor “ears” */}
      <g className="ask-cell-ear ask-cell-ear--l" style={{ transformOrigin: "11px 8px" }}>
        <path
          d="M10.2 11.5c-1.8-4.2-4.8-5.6-6.4-5.2-.4.8.4 3.6 2.6 5.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
        <circle cx="3.6" cy="6.1" r="1.55" fill="currentColor" opacity="0.85" />
      </g>
      <g className="ask-cell-ear ask-cell-ear--r" style={{ transformOrigin: "29px 8px" }}>
        <path
          d="M29.8 11.5c1.8-4.2 4.8-5.6 6.4-5.2.4.8-.4 3.6-2.6 5.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
        <circle cx="36.4" cy="6.1" r="1.55" fill="currentColor" opacity="0.85" />
      </g>

      {/* Soft membrane blob */}
      <g className="ask-cell-body">
        <path
          className="ask-cell-membrane"
          d="M20 6.2c4.8 0 8.6 1.4 11 4.2 2.2 2.6 3.2 6.1 2.6 9.6-.5 3.2-2.4 6-5.2 7.8-2.6 1.7-5.8 2.4-8.4 2.2-2.8-.2-5.4-1.4-7.4-3.4-2.2-2.2-3.4-5.2-3.6-8.2-.2-3.4 1-6.8 3.4-9 2.2-2 5.2-3.2 7.6-3.2z"
          fill="currentColor"
          opacity="0.14"
        />
        <path
          d="M20 6.2c4.8 0 8.6 1.4 11 4.2 2.2 2.6 3.2 6.1 2.6 9.6-.5 3.2-2.4 6-5.2 7.8-2.6 1.7-5.8 2.4-8.4 2.2-2.8-.2-5.4-1.4-7.4-3.4-2.2-2.2-3.4-5.2-3.6-8.2-.2-3.4 1-6.8 3.4-9 2.2-2 5.2-3.2 7.6-3.2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinejoin="round"
        />

        {/* Multi-lobed nucleus (neutrophil wink) */}
        <ellipse cx="15.2" cy="18.2" rx="3.4" ry="4.2" fill="currentColor" opacity="0.22" />
        <ellipse cx="20.6" cy="21.4" rx="3.8" ry="3.6" fill="currentColor" opacity="0.22" />
        <ellipse cx="25.4" cy="17.6" rx="3.1" ry="3.8" fill="currentColor" opacity="0.22" />

        {/* Granule freckles */}
        <circle cx="12.4" cy="24.8" r="1.05" fill="currentColor" opacity="0.28" />
        <circle cx="27.8" cy="24.2" r="0.9" fill="currentColor" opacity="0.28" />
        <circle cx="19.2" cy="12.4" r="0.75" fill="currentColor" opacity="0.22" />

        {/* Eyes */}
        <g className="ask-cell-face">
          <g className="ask-cell-eye ask-cell-eye--l" style={{ transformOrigin: "15.2px 16.2px" }}>
            <ellipse cx="15.2" cy="16.2" rx="2.55" ry="2.85" fill="currentColor" opacity="0.12" />
            <ellipse className="ask-cell-sclera" cx="15.2" cy="16.2" rx="2.35" ry="2.55" fill="var(--surface, #fff)" />
            <circle className="ask-cell-pupil" cx="15.55" cy="16.45" r="1.15" fill="var(--text, #1a2438)" />
            <circle cx="16.15" cy="15.75" r="0.35" fill="var(--surface, #fff)" opacity="0.95" />
          </g>
          <g className="ask-cell-eye ask-cell-eye--r" style={{ transformOrigin: "24.8px 16.2px" }}>
            <ellipse cx="24.8" cy="16.2" rx="2.55" ry="2.85" fill="currentColor" opacity="0.12" />
            <ellipse className="ask-cell-sclera" cx="24.8" cy="16.2" rx="2.35" ry="2.55" fill="var(--surface, #fff)" />
            <circle className="ask-cell-pupil" cx="25.15" cy="16.45" r="1.15" fill="var(--text, #1a2438)" />
            <circle cx="25.75" cy="15.75" r="0.35" fill="var(--surface, #fff)" opacity="0.95" />
          </g>

          {/* Mouth: closed smile + open talk oval */}
          <path
            className="ask-cell-mouth ask-cell-mouth--smile"
            d="M16.6 22.4c1.2 1.5 2.6 2.2 3.4 2.2s2.2-.7 3.4-2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeLinecap="round"
          />
          <ellipse
            className="ask-cell-mouth ask-cell-mouth--open"
            cx="20"
            cy="23.1"
            rx="2.4"
            ry="1.7"
            fill="currentColor"
            opacity="0.72"
          />
        </g>
      </g>

      {/* Sound arcs while speaking */}
      <g className="ask-cell-waves" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" fill="none">
        <path d="M33.2 15.2c1.7 1.9 1.7 7.7 0 9.6" />
        <path d="M35.8 12.8c2.8 2.8 2.8 12.6 0 15.4" />
      </g>

      {/* Listen dots while active */}
      <g className="ask-cell-dots" fill="currentColor">
        <circle className="ask-cell-dot ask-cell-dot--a" cx="34.2" cy="13.2" r="1.25" />
        <circle className="ask-cell-dot ask-cell-dot--b" cx="36.6" cy="20" r="1.05" />
        <circle className="ask-cell-dot ask-cell-dot--c" cx="34.2" cy="26.8" r="1.25" />
      </g>
    </svg>
  );
}
