import { defineConfig } from "vitest/config";
import path from "node:path";

/** D-11: avoid @vitejs/plugin-react here — it hung Vitest at collection. */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environmentMatchGlobs: [["**/*.{test,spec}.tsx", "jsdom"]],
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
