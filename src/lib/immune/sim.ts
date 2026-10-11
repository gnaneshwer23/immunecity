/* Immune Super Intelligence — infection dynamics model (teaching ODE, normalised units) */
export interface SimParams { inoculum: number; growth: number; innate: number; adaptive: number; cytokineGain: number; regulation: number; memory: number; lag: number; exhaustion?: number; rechallenge?: number }
export interface Intervention { strength: number; day?: number }
export interface Interventions { anticytokine?: Intervention; steroid?: Intervention; checkpoint?: Intervention; antibiotic?: Intervention }
export interface SimPoint { t: number; P: number; N: number; C: number; A: number; R: number; D: number; E: number; M: number }
export type Outcome = "overwhelming" | "persistent" | "immunopathology" | "cleared";

export function run(p: SimParams, iv: Interventions = {}) {
  const dt = 0.01, T = 30, out: SimPoint[] = [];
  /* E: T-cell exhaustion from persistent antigen (blunts killing, reversed by checkpoint blockade).
     M: memory pool built by the adaptive response; it boosts adaptive cells at re-challenge. */
  let E = 0, M = 0, rechallenged = false;
  const ex = p.exhaustion ?? 1;
  let L = 0, P = p.inoculum, N = 0.02, C = 0.01, A = 0.02 + p.memory * 0.6, R = 0.05, D = 0;
  const sig = (x: number) => 1 / (1 + Math.exp(-x));
  for (let k = 0, t = 0; t <= T; k++, t = k * dt) {
    const on = (x?: Intervention) => (x && t >= (x.day || 0) ? x.strength : 0);
    const blk = on(iv.anticytokine);
    const st = on(iv.steroid);
    const cpi = on(iv.checkpoint);
    const abx = on(iv.antibiotic);
    if (p.rechallenge && !rechallenged && t >= p.rechallenge) { rechallenged = true; P += p.inoculum; A += 0.6 * M; }
    const ant = P / (P + 0.02) + 0.03 * A;
    const kill = 1 / (1 + 1.5 * E);
    const gate = sig((t - p.lag) * 2.2);
    L += (ant - 0.25 * L) * dt;
    const drive = L / (L + 0.15);
    const dP = p.growth * P * (1 - P) - 2.2 * p.innate * N * P - 5 * A * kill * P - 2.5 * abx * P;
    const dN = p.innate * (2.2 * ant * (0.4 + P) + 0.8 * C) * (1 - N) * (1 - 0.6 * st) - 0.9 * N - 0.5 * p.regulation * R * N;
    const dC = p.cytokineGain * (1.1 * N * ant + 0.55 * C * N + 0.25 * A * ant) * (1 - blk) * (1 - 0.7 * st) - 1.1 * C - 0.9 * p.regulation * R * C;
    const dA = p.adaptive * gate * drive * (0.7 + 0.5 * Math.min(C, 2)) * (A + 0.02) * (1 - A / 1.6) * 2.6 * (1 - 0.5 * st) - 0.08 * A - 0.3 * p.regulation * R * A * (1 - 0.85 * cpi);
    const dR = 0.22 * (A + 0.6 * C) * (1 - 0.4 * cpi) - 0.18 * R;
    const dE = ex * 0.05 * (P > 0.01 ? 1 : 0) * A * (1 - 0.8 * cpi) - (0.03 + 0.15 * cpi) * E;
    const dM = 0.04 * A * gate * (1 - M) - 0.002 * M;
    const dD = 0.5 * C * C + 0.12 * N + 0.35 * P - 0.15 * D;
    P = Math.max(0, P + dP * dt); N = Math.max(0, N + dN * dt); C = Math.max(0, C + dC * dt);
    A = Math.max(0, A + dA * dt); R = Math.max(0, R + dR * dt); D = Math.max(0, D + dD * dt);
    E = Math.max(0, E + dE * dt); M = Math.min(1, Math.max(0, M + dM * dt));
    if (P < 1e-5) P = 0;
    if (k % 10 === 0) out.push({ t: +t.toFixed(2), P, N, C, A, R, D, E, M });
  }
  return { series: out, summary: summarise(out) };
}

function summarise(s: SimPoint[]) {
  const max = (k: keyof SimPoint) => s.reduce((m, x) => Math.max(m, x[k]), 0);
  const Pend = s[s.length - 1]!.P, Pmax = max("P"), Dmax = max("D"), Cmax = max("C");
  let clear: number | null = null;
  const peakIdx = s.findIndex((x) => x.P === Pmax);
  /* clearance is judged on the first infection's course */
  for (let i = peakIdx; i < s.length; i++) if (s[i]!.P < 1e-4) { clear = s[i]!.t; break; }
  let outcome: Outcome;
  if (Pend > 0.02 && Pmax > 0.85) outcome = "overwhelming";
  else if (Pend > 0.002) outcome = "persistent";
  else if (Dmax > 1.6) outcome = "immunopathology";
  else outcome = "cleared";
  return { Pend, Pmax, Dmax, Cmax, clear, outcome, Amax: max("A"), Emax: max("E"), Mend: s[s.length - 1]!.M };
}

export const ImmuneSim = { run };
