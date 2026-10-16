import { expect, test, type Page } from "@playwright/test";

const PRIMARY = ["Platform", "Academy", "Scientific AI", "Evidence & Methods", "About", "Collaborate"];

async function expectDesktopNav(page: Page) {
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeVisible();
  for (const label of PRIMARY) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /More/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Explore Immune City" }).first()).toBeVisible();
  // Insights stays out of primary header
  await expect(nav.getByRole("link", { name: "Insights" })).toHaveCount(0);
}

async function openCompactNav(page: Page) {
  const toggle = page.getByRole("button", { name: /Open navigation|Close navigation|Toggle navigation/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  const panel = page.locator(".marketing-compact-nav");
  await expect(panel).toBeVisible();
  return panel;
}

test.describe("marketing navigation", () => {
  test("desktop shows primary links, Collaborate, CTA; no More menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop viewport only");
    await page.goto("/");
    await expectDesktopNav(page);
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Academy", exact: true }).click();
    await expect(page).toHaveURL(/\/academy/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("1024px dead-zone boundary: hamburger + compact panel with every destination", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet-deadzone", "1024 viewport only");
    await page.goto("/");
    // Desktop strip must be gone; toggle must remain (fixes 801–1100 dead zone)
    await expect(page.locator(".marketing-nav")).toBeHidden();
    const panel = await openCompactNav(page);
    for (const label of PRIMARY) {
      await expect(panel.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(panel.getByRole("link", { name: /Explore Immune City|Enter atlas/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("mobile compact panel: navigate, Escape, outside click", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
    await page.goto("/");
    const panel = await openCompactNav(page);
    await panel.getByRole("link", { name: "Evidence & Methods", exact: true }).click();
    await expect(page).toHaveURL(/\/methods/);
    await expect(page.locator(".marketing-compact-nav")).toBeHidden();

    await openCompactNav(page);
    await page.locator(".marketing-nav-scrim").click({ position: { x: 8, y: 40 } });
    await expect(page.locator(".marketing-compact-nav")).toBeHidden();
  });

  test("footer still exposes Insights", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "once is enough");
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Insights" }).click();
    await expect(page).toHaveURL(/\/insights/);
  });
});
