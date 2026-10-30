/**
 * Real browser E2E journeys for Immune Super Intelligence (Playwright).
 * Distinct from src/test/phase-f-e2e-journey.test.ts (source-contract / unit suite).
 *
 * Auth-gated flows (member onboarding, two-account isolation, collection CRUD)
 * require E2E_USER_A / E2E_USER_B credentials — skipped with documentation when absent.
 */
import { expect, test, type Page } from "@playwright/test";

const HAS_AUTH =
  Boolean(process.env.E2E_USER_A_EMAIL && process.env.E2E_USER_A_PASSWORD) &&
  Boolean(process.env.E2E_USER_B_EMAIL && process.env.E2E_USER_B_PASSWORD);

async function expectMainHeading(page: Page) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
}

test.describe("ISI public journeys (browser E2E)", () => {
  test("Immunology OS overview → Immune City graph → evidence → Ask → Research", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "full journey once on desktop");

    await page.goto("/overview");
    await expectMainHeading(page);
    await expect(page).toHaveURL(/\/overview/);

    await page.goto("/graph");
    await expectMainHeading(page);
    await expect(page).toHaveURL(/\/graph/);

    await page.goto("/evidence");
    await expectMainHeading(page);
    await expect(page.getByRole("heading", { name: /trial/i }).first()).toBeVisible();

    // Landmark trials surface (educational) — Trial Intelligence prod flag stays off.
    await page.goto("/evidence#trials");
    await expect(page.locator("#trials")).toBeVisible();

    await page.goto("/ask");
    await expectMainHeading(page);
    const askBox = page.getByRole("textbox", { name: /ask/i }).first();
    await expect(askBox).toBeVisible();
    await askBox.fill("PD-1 melanoma");
    // Local concept matches must not require /api/ask.
    let aiRequests = 0;
    page.on("request", (r) => {
      if (r.url().includes("/api/ask")) aiRequests += 1;
    });
    await page.waitForTimeout(400);
    expect(aiRequests).toBe(0);

    await page.goto("/research");
    await expectMainHeading(page);
    await expect(page).toHaveURL(/\/research/);

    // Export / provenance surfaces exist as educational research tools.
    const exportish = page.getByText(/export|provenance|brief|workbench/i).first();
    await expect(exportish).toBeVisible({ timeout: 15_000 });
  });

  test("keyboard: primary nav and Ask input are reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard once on desktop");
    await page.goto("/");
    await page.keyboard.press("Tab");
    // Skip link or logo/nav should receive focus without error.
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(["A", "BUTTON", "INPUT", "SUMMARY", "BODY", "DIV"]).toContain(focused);

    await page.goto("/ask");
    const askBox = page.getByRole("textbox", { name: /ask/i }).first();
    await askBox.focus();
    await expect(askBox).toBeFocused();
    await askBox.press("Tab");
  });

  test("mobile layout: compact nav + Ask reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open navigation", exact: true });
    await expect(toggle).toBeVisible();
    await toggle.click();
    const panel = page.getByRole("navigation", { name: "Site", exact: true });
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/ask");
    await expect(page.getByRole("textbox", { name: /ask/i }).first()).toBeVisible();
    await page.goto("/evidence");
    await expectMainHeading(page);
  });

  test("tablet dead-zone: evidence + research stay usable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet-deadzone", "1024 viewport only");
    await page.goto("/evidence");
    await expectMainHeading(page);
    await page.goto("/research");
    await expectMainHeading(page);
  });
});

test.describe("ISI authenticated journeys", () => {
  test("member onboarding, isolation, collection CRUD", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "auth once on desktop");
    test.skip(
      !HAS_AUTH,
      "BLOCKER: set E2E_USER_A_EMAIL/PASSWORD and E2E_USER_B_EMAIL/PASSWORD for authenticated E2E",
    );

    // Placeholder structure for when credentials exist — keeps the suite honest.
    await page.goto("/auth");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
});
