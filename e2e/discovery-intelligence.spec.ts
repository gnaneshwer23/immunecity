/**
 * Discovery Intelligence browser journeys (Phase 8).
 *
 * Public paths always run. Authenticated paths require E2E_USER_* credentials.
 * SKIP ≠ PASS: when credentials are missing, Playwright reports skipped separately.
 * Never treat skipped auth coverage as green for isolation or entitlement gates.
 *
 * Prefer E2E_BASE_URL (production or preview) if local Vite OOM; document gaps in
 * docs/ISI_DISCOVERY_PHASE7_8_REPORT.md when preview cannot start.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  primaryE2EUser,
  signInWithEmail,
  SKIP_AUTH_SINGLE,
} from "./auth-helpers";

async function expectMainHeading(page: Page) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
}

test.describe("Discovery public journeys", () => {
  test("radar → gaps → onboarding structure + honesty copy", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "discovery once on desktop");
    await page.goto("/discovery");
    await expectMainHeading(page);
    await expect(page.getByText(/coverage honesty|coverage_insufficient|candidate/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/billing not activated|entitlement|quota/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/discovery/gaps");
    await expectMainHeading(page);

    const firstGap = page.locator('a[href*="/discovery/gaps/"]').first();
    if (await firstGap.count()) {
      await firstGap.click();
      await expect(page.getByText(/why it matters|search scope|verification/i).first()).toBeVisible({
        timeout: 15_000,
      });
      // Follow control exists; exact "billing not activated" label is asserted in source/a11y
      // tests. Production/preview may lag until deploy — do not fail public journey on copy lag.
      const follow = page.getByRole("button", { name: /Follow/i }).first();
      await expect(follow).toBeVisible({ timeout: 10_000 });
    }

    await page.goto("/discovery/onboarding");
    await expectMainHeading(page);
    await page.goto("/discovery/alerts");
    await expectMainHeading(page);
  });

  test("discovery a11y smoke: main landmark + h1", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a11y smoke once on desktop");
    for (const path of ["/discovery", "/discovery/gaps", "/discovery/onboarding", "/discovery/alerts"]) {
      await page.goto(path);
      await expect(page.locator("main#main")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});

test.describe("Discovery authenticated journeys (credentials required)", () => {
  test("profile shows plan quotas + billing-not-activated copy", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "auth once on desktop");
    const user = primaryE2EUser();
    test.skip(!user, SKIP_AUTH_SINGLE);

    await signInWithEmail(page, user!, "/discovery/profile");
    await expect(page).toHaveURL(/\/discovery\/profile/);
    await expectMainHeading(page);
    await expect(page.getByText(/billing not activated/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Followed gaps|Monitor runs|Radar limit|Plan:/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/user_roles|orthogonal/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("alerts monitor action surfaces without inventing review", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "auth once on desktop");
    const user = primaryE2EUser();
    test.skip(!user, SKIP_AUTH_SINGLE);

    await signInWithEmail(page, user!, "/discovery/alerts");
    await expectMainHeading(page);
    await expect(page.getByRole("button", { name: /Run monitor now/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/not automatic scientific review|Email is deferred/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
