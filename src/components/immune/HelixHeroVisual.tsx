import { useEffect, useRef, useState } from "react";

/**
 * Original ISI helix stage — canvas double helix with molecular detail.
 * Inspired by the mood of slow scientific heroes (dark field, precise motion);
 * not derived from proprietary template code or assets.
 */
export function HelixHeroVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let t0 = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();

    const drawStaticBackdrop = () => {
      // Quiet depth field — keep the left reading plane clean
      const g = ctx.createRadialGradient(w * 0.68, h * 0.44, 0, w * 0.68, h * 0.44, Math.max(w, h) * 0.48);
      g.addColorStop(0, "rgba(56, 189, 198, 0.1)");
      g.addColorStop(0.5, "rgba(20, 48, 92, 0.22)");
      g.addColorStop(1, "rgba(6, 14, 32, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(160, 220, 230, 0.16)";
      for (let i = 0; i < 28; i++) {
        const x = 0.42 * w + ((i * 97) % 1000) / 1000 * w * 0.55;
        const y = ((i * 61) % 1000) / 1000 * h;
        const r = 0.55 + (i % 3) * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawHelix = (time: number) => {
      const cx = w * 0.68;
      const cy = h * 0.5;
      const amp = Math.min(w, h) * 0.15;
      const turns = 3.2;
      const steps = 160;
      const len = Math.min(h * 0.78, w * 0.72);
      const tilt = -0.38;
      const phase = time * 0.00022;

      type Pt = { x: number; y: number; z: number; i: number };
      const strandA: Pt[] = [];
      const strandB: Pt[] = [];

      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const ang = u * turns * Math.PI * 2 + phase;
        const y0 = (u - 0.5) * len;
        const xA = Math.cos(ang) * amp;
        const zA = Math.sin(ang) * amp;
        const xB = Math.cos(ang + Math.PI) * amp;
        const zB = Math.sin(ang + Math.PI) * amp;
        // Mild perspective / tilt into depth
        const persp = (z: number) => 1 / (1.55 - z / (amp * 2.8));
        const map = (x: number, y: number, z: number): Pt => {
          const s = persp(z);
          return {
            x: cx + (x * Math.cos(tilt) - y * Math.sin(tilt)) * s,
            y: cy + (x * Math.sin(tilt) + y * Math.cos(tilt)) * s * 0.92,
            z,
            i,
          };
        };
        strandA.push(map(xA, y0, zA));
        strandB.push(map(xB, y0, zB));
      }

      const strokeStrand = (pts: Pt[], color: string) => {
        ctx.beginPath();
        pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Nucleotide nodes
        for (let i = 0; i < pts.length; i += 5) {
          const p = pts[i]!;
          const depth = (p.z / amp + 1) / 2;
          const r = 1.6 + depth * 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 245, 250, ${0.35 + depth * 0.45})`;
          ctx.fill();
        }
      };

      // Base-pair rungs drawn back-to-front by z
      const pairs: { a: Pt; b: Pt; z: number }[] = [];
      for (let i = 0; i < strandA.length; i += 4) {
        const a = strandA[i]!;
        const b = strandB[i]!;
        pairs.push({ a, b, z: (a.z + b.z) / 2 });
      }
      pairs.sort((p, q) => p.z - q.z);
      for (const { a, b, z } of pairs) {
        const depth = (z / amp + 1) / 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(94, 210, 220, ${0.12 + depth * 0.28})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // Draw far strand then near
      const avgZ = (pts: Pt[]) => pts.reduce((s, p) => s + p.z, 0) / pts.length;
      const order = avgZ(strandA) < avgZ(strandB)
        ? [strandA, strandB] as const
        : [strandB, strandA] as const;
      strokeStrand(order[0], "rgba(72, 196, 210, 0.55)");
      strokeStrand(order[1], "rgba(140, 230, 235, 0.78)");

      // Soft cyan rim light
      const rim = ctx.createRadialGradient(cx, cy - len * 0.15, 8, cx, cy, len * 0.55);
      rim.addColorStop(0, "rgba(100, 220, 230, 0.08)");
      rim.addColorStop(1, "rgba(100, 220, 230, 0)");
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, w, h);
    };

    const frame = (now: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      drawStaticBackdrop();
      drawHelix(now - t0);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduceMotion]);

  return (
    <div className="helix-stage" aria-hidden="true">
      <div className="helix-glow" />
      {reduceMotion ? (
        <svg className="helix-static" viewBox="0 0 480 560" role="presentation">
          <defs>
            <linearGradient id="hx-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5ec8d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#2a7a8a" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="hx-b" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8f0f4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3a9aa8" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="hx-glow" cx="50%" cy="42%" r="50%">
              <stop offset="0%" stopColor="#38bdc6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#06101f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="480" height="560" fill="url(#hx-glow)" />
          <path
            d="M210 40 C 320 90, 120 150, 250 210 C 380 270, 140 330, 260 390 C 380 450, 160 500, 230 540"
            fill="none"
            stroke="url(#hx-a)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M270 40 C 160 90, 360 150, 230 210 C 100 270, 340 330, 220 390 C 100 450, 320 500, 250 540"
            fill="none"
            stroke="url(#hx-b)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {[90, 150, 210, 270, 330, 390, 450].map((y, i) => (
            <line
              key={y}
              x1={210 + (i % 2) * 18}
              y1={y}
              x2={270 - (i % 2) * 18}
              y2={y + 6}
              stroke="rgba(120,210,220,0.35)"
              strokeWidth="1.2"
            />
          ))}
        </svg>
      ) : (
        <canvas ref={canvasRef} className="helix-canvas" />
      )}
      <div className="helix-vignette" />
    </div>
  );
}
