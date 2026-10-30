import { defineConfig } from "vitest/config";
import path from "node:path";

/** D-11: avoid @vitejs/plugin-react here — it hung Vitest at collection. */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // bun:test module. These files are run with `bun test`, not the vitest pool.
    // bun:test module. These files are run with `bun test`, not the vitest pool (D-11 hang risk).
    exclude: [
      "src/test/phase2-scientific-ux.test.ts",
      "src/test/community-phase3.test.ts",
      "src/test/community-phase4.test.ts",
      "src/test/community-phase5.test.ts",
      "src/test/ask-quality-loop.test.ts",
      "src/test/ask-live-answer-verification.test.ts",
      // bun:test — Vitest pool hangs on collection in this environment; run with `bun test`.
      "src/test/trial-intelligence.test.ts",
      "src/test/phase1-evidence-foundation.test.ts",
      "src/test/phase2-trial-intelligence.test.ts",
      "src/test/claim-review-kind.test.ts",
      "src/test/melanoma-curation-matrix.test.ts",
      "src/test/discovery-intelligence.test.ts",
      "src/test/post-af-scientific-brief-audit.test.ts",
      "src/test/phase-c-evidence-intelligence.test.ts",
    ],
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
