import { describe, expect, it, vi } from "vitest";
import { evidencePage, evidencePageSchema } from "@/lib/immune/evidencePagination";
import { neonAuth } from "@/integrations/neon/auth-client";

describe("bounded evidence pagination", () => {
  it("returns the next cursor without losing the overflow row", () => {
    const rows = Array.from({ length: 51 }, (_, i) => ({ evidenceId: `EV-${i}` }));
    const first = evidencePage(rows, 50);
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toBe("EV-49");
    const last = evidencePage(rows.slice(50), 50);
    expect(last.items).toEqual([{ evidenceId: "EV-50" }]);
    expect(last.nextCursor).toBeNull();
  });
  it("bounds requests to 100 rows and defaults to 50", () => {
    expect(evidencePageSchema.parse({}).limit).toBe(50);
    expect(evidencePageSchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});

describe("unavailable sign-in", () => {
  it("returns a recoverable error instead of rejecting when configuration is absent", async () => {
    vi.stubEnv("VITE_NEON_AUTH_URL", "");
    vi.stubEnv("NEON_AUTH_BASE_URL", "");
    try {
      const result = await neonAuth.getUser();
      expect(result.data).toBeNull();
      expect(result.error?.message).toContain("Sign-in is currently unavailable");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});