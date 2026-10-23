import { defineConfig } from "vitest/config";
import path from "node:path";

/** D-11: avoid @vitejs/plugin-react here — it hung Vitest at collection. */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // bun:test module. The Phase 2 file is run with `bun test`, not the vitest pool.
    exclude: ["src/test/phase2-scientific-ux.test.ts"],
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
