/**
 * P0-F07 feature flag for Trial Intelligence UI.
 * Off by default — existing atlas/graph journeys stay unchanged.
 *
 * Enable with either:
 *   VITE_TRIAL_INTELLIGENCE=1   (build / Vite env)
 *   TRIAL_INTELLIGENCE=1       (SSR / Node process env)
 *
 * Runtime kill (P2): unset the env var (or set `0`) in the host (e.g. Vercel
 * Production) and redeploy. There is no remote config / in-app kill switch —
 * the flag is env-driven at build/SSR read time only.
 */

const TRUTH = new Set(["1", "true", "yes", "on"]);

function readEnv(name: string): string | undefined {
  // Prefer process.env so tests and SSR can flip the flag without a rebuild.
  if (typeof process !== "undefined" && process.env?.[name] != null && process.env[name] !== "") {
    return String(process.env[name]);
  }
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.[name] != null && import.meta.env[name] !== "") {
      return String(import.meta.env[name]);
    }
  } catch {
    /* non-Vite contexts */
  }
  return undefined;
}

/** True when Trial Intelligence panels may render. */
export function isTrialIntelligenceEnabled(): boolean {
  const raw = readEnv("VITE_TRIAL_INTELLIGENCE") ?? readEnv("TRIAL_INTELLIGENCE") ?? "";
  return TRUTH.has(raw.trim().toLowerCase());
}

export const TRIAL_INTELLIGENCE_FLAG = "VITE_TRIAL_INTELLIGENCE" as const;
