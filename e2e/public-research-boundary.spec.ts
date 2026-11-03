import { test, expect } from "@playwright/test";

test("public pages expose graph and evidence, not the internal case workbench", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Immunology");
  await expect(page.getByRole("link", { name: /Open research workbench/ })).toHaveCount(0);
  await expect(page.locator('a[href*="synthetic-programme"], a[href*="internal-research"], a[href*="programme-trials"]')).toHaveCount(0);
  await page.getByRole("link", { name: /^Explore knowledge graph/ }).first().click();
  await expect(page).toHaveURL(/\/graph(?:\?|$)/);
  await page.goto("/research#synthetic-programme");
  await expect(page.getByTestId("synthetic-programme")).toHaveCount(0);
  await expect(page.getByTestId("synthetic-project")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Workbench", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Advanced model registry", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Frontier and roadmap", exact: true })).toHaveCount(0);
  for (const path of ["/methods", "/overview", "/about", "/explore"]) {
    await page.goto(path);
    await expect(page.locator('a[href^="/internal-research"], a[href^="/hsi-consume"], a[href^="/simulator"], a[href^="/patient"], a[href^="/reasoning"]')).toHaveCount(0);
  }
  const sitemap = await page.request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toMatch(/<loc>[^<]*\/(simulator|patient|reasoning|internal-research|hsi-consume)<\/loc>/);
  for (const path of ["/simulator", "/patient", "/reasoning", "/hsi-consume", "/hsi/discovery"]) {
    await page.goto(path);
    await expect(page.getByRole("status")).toContainText("Administrator access is required", { timeout: 30_000 });
  }
  await page.goto("/internal-research?admin=true");
  await expect(page.getByRole("status")).toContainText("Administrator access is required", { timeout: 30_000 });
  await expect(page.getByTestId("synthetic-programme")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export synthetic case dossier" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
