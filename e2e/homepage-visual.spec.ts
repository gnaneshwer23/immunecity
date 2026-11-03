import { test, expect } from "@playwright/test";

test("homepage topic boxes support keyboard navigation and public concept links", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const cells = page.getByRole("tab", { name: /Immune cells/ });
  await expect(cells).toBeEnabled({ timeout: 30_000 });
  await expect(cells).toHaveAttribute("aria-selected", "true");
  await cells.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Mechanisms/ })).toHaveAttribute("aria-selected", "true");
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByRole("heading")).toHaveText("Follow a signal through the system.");
  await expect(panel.getByRole("link", { name: "NF-κB signalling", exact: false })).toHaveAttribute("href", /\/atlas\/P001/);
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /Disease context/ })).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByRole("link", { name: /Rheumatoid arthritis/ })).toHaveAttribute("href", /\/atlas\/D001/);
  await panel.scrollIntoViewIfNeeded();
  await expect.poll(() => panel.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("tab", { name: /Immune cells/ }).click();
  await expect(panel.getByRole("heading")).toHaveText("Start with the cells that shape immunity.");
  await expect(page.getByRole("link", { name: "Open Ask Immune", exact: true })).toHaveAttribute("href", /\/ask/);
  await expect(page.getByRole("link", { name: "Open research library", exact: true })).toHaveAttribute("href", /\/research.*#library/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('a[href*="internal-research"], a[href*="synthetic-programme"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
