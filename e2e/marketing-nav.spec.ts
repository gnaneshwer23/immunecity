import { expect, test, type Page } from "@playwright/test";

const JOURNEYS = ["Learn", "Explore", "Investigate"];
const DESTINATIONS = ["Platform", "Academy", "Cell atlas", "Knowledge graph", "Evidence", "Methods", "Reasoning & AI", "Research library", "Research", "Simulate", "Community", "Vision", "About", "Collaborate"];

async function expectDesktopNav(page: Page) {
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeVisible();
  for (const label of JOURNEYS) {
    await expect(nav.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  await expect(nav.getByRole("link", { name: "Ask Immune", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Research", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Simulate", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Community", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Vision", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "About", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /More/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Explore the Immune System" }).first()).toBeVisible();
  // Insights stays out of primary header
  await expect(nav.getByRole("link", { name: "Insights" })).toHaveCount(0);
}

async function openCompactNav(page: Page) {
  const toggle = page.getByRole("button", { name: "Open navigation", exact: true });
  await expect(toggle).toBeVisible();
  await toggle.click();
  const panel = page.getByRole("navigation", { name: "Site", exact: true });
  await expect(panel).toBeVisible();
  return panel;
}

test.describe("marketing navigation", () => {
  test("desktop shows primary links, Collaborate, CTA; no More menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop viewport only");
    await page.goto("/");
    await expectDesktopNav(page);
    await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Learn", exact: true }).click();
    await page.getByRole("menu", { name: "Learn", exact: true }).getByRole("menuitem", { name: /Academy/ }).click();
    await expect(page).toHaveURL(/\/academy/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("1024px dead-zone boundary: hamburger + compact panel with every destination", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet-deadzone", "1024 viewport only");
    await page.goto("/");
    // Desktop strip must be gone; toggle must remain (fixes 801–1100 dead zone)
    await expect(page.getByRole("navigation", { name: "Primary", exact: true })).toBeHidden();
    const panel = await openCompactNav(page);
    for (const label of DESTINATIONS) {
      await expect(panel.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(panel.getByRole("link", { name: /Explore the Immune System|Enter atlas/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("mobile compact panel: navigate, Escape, outside click", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
    await page.goto("/");
    const panel = await openCompactNav(page);
    await panel.getByRole("link", { name: "Methods", exact: true }).click();
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

  test("local concept lookup opens details without asking AI", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "once is enough");
    let aiRequests = 0;
    page.on("request", (r) => { if (r.url().endsWith("/api/ask")) aiRequests += 1; });
    await page.goto("/reasoning");
    await page.getByRole("textbox", { name: "Ask the atlas a question" }).fill("TNF");
    await page.locator(".ask-quick-matches").getByRole("button", { name: "TNF Molecule", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Concept details", exact: true })).toBeVisible();
    expect(aiRequests).toBe(0);
    await page.getByRole("dialog", { name: "Concept details" }).getByRole("link", { name: /Highlight in graph/ }).click();
    await expect(page).toHaveURL(/\/graph\?focus=/);
    await expect(page.locator(".graph-detail").filter({ visible: true }).first()).toBeVisible();
  });
});
