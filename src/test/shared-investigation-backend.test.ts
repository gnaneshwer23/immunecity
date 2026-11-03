import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import provenance from "@/lib/hsi/vendor/investigationBackend.provenance.json";
import { INVESTIGATION_BACKEND_VERSION } from "@/lib/hsi/vendor/investigationBackend";
test("ISI pins the canonical owner-scoped investigation backend", () => {
  expect(createHash("sha256").update(readFileSync("src/lib/hsi/vendor/investigationBackend.ts")).digest("hex")).toBe(provenance.sha256);
  expect(provenance.version).toBe(INVESTIGATION_BACKEND_VERSION);
  expect(provenance.includesProductData).toBe(false);
});
