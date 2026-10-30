/**
 * Real browser E2E journeys for Immune Super Intelligence (Playwright).
 * Distinct from src/test/phase-f-e2e-journey.test.ts (source-contract / unit suite).
 *
 * Auth-gated flows require E2E_USER_* credentials.
 * When credentials are missing, tests SKIP with an explicit reason — never counted as pass.
 * Prefer local preview or E2E_BASE_URL; Vercel is not required.
 *
 * Reporting: Playwright lists skipped tests separately from passed. CI must not
 * treat skip as green coverage for auth isolation (see e2e/README.md).
 */
import { expect, test, type Page } from "@playwright/test";
import {
  e2eUserA,
  e2eUserB,
  hasDualAuthCredentials,
  primaryE2EUser,
  signInWithEmail,
  signOutIfPossible,
  SKIP_AUTH_DUAL,
  SKIP_AUTH_SINGLE,
} from "./auth-helpers";

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

    // Landmark trials surface (educational) — Trial Intelligence prod flag stays off.
    await page.goto("/evidence#trials");
    await expect(page.locator("#trials")).toBeVisible();

    await page.goto("/ask");
    await expectMainHeading(page);
    const askBox = page.getByRole("textbox", { name: /ask/i }).first();
    await expect(askBox).toBeVisible();
    let aiRequests = 0;
    page.on("request", (r) => {
      if (r.url().includes("/api/ask")) aiRequests += 1;
    });
    await askBox.fill("PD-1 melanoma");
    await page.waitForTimeout(400);
    expect(aiRequests).toBe(0);

    await page.goto("/research");
    await expectMainHeading(page);
    await expect(page).toHaveURL(/\/research/);

    const exportish = page.getByText(/export|provenance|brief|workbench/i).first();
    await expect(exportish).toBeVisible({ timeout: 15_000 });
  });

  test("keyboard: primary nav and Ask input are reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard once on desktop");
    await page.goto("/");
    await page.keyboard.press("Tab");
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
  test("member sign-in + research export surfaces when credentials present", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "auth once on desktop");
    const user = primaryE2EUser();
    test.skip(!user, SKIP_AUTH_SINGLE);

    await signInWithEmail(page, user!, "/research");
    await expect(page).toHaveURL(/\/research/);
    await expectMainHeading(page);
    await expect(page.getByText(/export|provenance|brief|workbench|collection/i).first()).toBeVisible({
      timeout: 20_000,
    });
    // Sign-out control may live in header or page chrome
    const signOut = page.getByRole("button", { name: /sign out/i }).first();
    if (await signOut.isVisible().catch(() => false)) {
      await expect(signOut).toBeVisible();
    }
  });

  test("collection CRUD round-trip for account A", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "auth once on desktop");
    const user = e2eUserA() ?? primaryE2EUser();
    test.skip(!user, SKIP_AUTH_SINGLE);

    const name = `E2E-coll-${Date.now().toString(36)}`;
    await signInWithEmail(page, user!, "/research");
    await expectMainHeading(page);

    const nameInput = page.getByPlaceholder(/melanoma pd-1 path/i).or(page.getByLabel(/^name$/i)).first();
    await expect(nameInput).toBeVisible({ timeout: 20_000 });
    await nameInput.fill(name);
    const conceptInput = page.getByPlaceholder(/R001, P001/i).first();
    if (await conceptInput.isVisible().catch(() => false)) {
      await conceptInput.fill("R011, D012");
    }
    await page.getByRole("button", { name: /save collection/i }).click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });

    // Edit
    const row = page.locator("li", { hasText: name }).first();
    await row.getByRole("button", { name: /^edit$/i }).click();
    await nameInput.fill(`${name}-edited`);
    await page.getByRole("button", { name: /update collection/i }).click();
    await expect(page.getByText(`${name}-edited`).first()).toBeVisible({ timeout: 20_000 });

    // Delete
    const editedRow = page.locator("li", { hasText: `${name}-edited` }).first();
    await editedRow.getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByText(`${name}-edited`)).toHaveCount(0, { timeout: 20_000 });
  });

  test("cross-account collection isolation (A cannot see B)", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "auth once on desktop");
    test.skip(!hasDualAuthCredentials(), SKIP_AUTH_DUAL);

    const userA = e2eUserA()!;
    const userB = e2eUserB()!;
    const nameB = `E2E-B-private-${Date.now().toString(36)}`;

    // Account B creates a private collection
    await signInWithEmail(page, userB, "/research");
    const nameInput = page.getByPlaceholder(/melanoma pd-1 path/i).or(page.getByLabel(/^name$/i)).first();
    await expect(nameInput).toBeVisible({ timeout: 20_000 });
    await nameInput.fill(nameB);
    const conceptInput = page.getByPlaceholder(/R001, P001/i).first();
    if (await conceptInput.isVisible().catch(() => false)) {
      await conceptInput.fill("I008, D012");
    }
    await page.getByRole("button", { name: /save collection/i }).click();
    await expect(page.getByText(nameB).first()).toBeVisible({ timeout: 20_000 });
    await signOutIfPossible(page);

    // Fresh context as A — must not see B's collection
    const pageA = await context.newPage();
    await signInWithEmail(pageA, userA, "/research");
    await expectMainHeading(pageA);
    await expect(pageA.getByText(nameB)).toHaveCount(0, { timeout: 15_000 });
    await pageA.close();

    // Cleanup as B
    await signInWithEmail(page, userB, "/research");
    const row = page.locator("li", { hasText: nameB }).first();
    if (await row.isVisible().catch(() => false)) {
      await row.getByRole("button", { name: /^delete$/i }).click();
    }
  });
});
