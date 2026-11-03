import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("synthetic project: analyse, save/restore, import and export with provenance", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/research#melanoma");
  const project = page.getByTestId("synthetic-project");
  await expect(project.getByRole("button", { name: "Load worked example", exact: true })).toBeEnabled({ timeout: 30_000 });
  await expect(project.getByText("SYNTHETIC DATA ONLY.", { exact: true })).toBeVisible();
  await project.getByRole("button", { name: "Export synthetic brief JSON", exact: true }).click();
  await expect(project.getByRole("alert")).toContainText("Select at least one");
  await project.getByLabel("Search synthetic findings", { exact: true }).fill("does-not-exist");
  await expect(project.getByText(/No fixture findings match/)).toBeVisible();
  await project.getByRole("button", { name: "Load worked example", exact: true }).click();
  await expect(project.getByLabel("Select SYN-EV-001", { exact: true })).toBeChecked();
  await expect(project.getByLabel("Select SYN-EV-002", { exact: true })).toBeChecked();
  await project.getByRole("textbox", { name: "Analysis note for SYN-EV-001", exact: true }).fill("Browser-test analyst note: retain uncertainty.");
  await project.getByRole("button", { name: "Record analysis for SYN-EV-001", exact: true }).click();
  await project.getByRole("textbox", { name: "Synthetic project hypothesis", exact: true }).fill("Saved synthetic processing hypothesis");
  await project.getByRole("button", { name: "Save project locally", exact: true }).click();
  await expect(project.getByRole("status")).toContainText("Saved on this browser only");
  await page.reload();
  await expect(project.getByRole("button", { name: "Restore saved project", exact: true })).toBeEnabled({ timeout: 30_000 });
  await project.getByRole("button", { name: "Restore saved project", exact: true }).click();
  await expect(project.getByRole("textbox", { name: "Synthetic project hypothesis", exact: true })).toHaveValue("Saved synthetic processing hypothesis");
  const [jsonDownload] = await Promise.all([
    page.waitForEvent("download"), project.getByRole("button", { name: "Export synthetic brief JSON", exact: true }).click(),
  ]);
  const brief = JSON.parse(await readFile((await jsonDownload.path())!, "utf8"));
  expect(brief.dataClass).toBe("synthetic");
  expect(brief.productionEligible).toBe(false);
  expect(brief.evidence[0].decision.note).toBe("Browser-test analyst note: retain uncertainty.");
  expect(brief.conflicts).toHaveLength(2);
  expect(brief.cohorts[0].responsePercent).toBe(35);
  const [markdownDownload] = await Promise.all([
    page.waitForEvent("download"), project.getByRole("button", { name: "Export synthetic brief Markdown", exact: true }).click(),
  ]);
  expect(await readFile((await markdownDownload.path())!, "utf8")).toContain("SYNTHETIC DEMONSTRATION");
  const [backup] = await Promise.all([
    page.waitForEvent("download"), project.getByRole("button", { name: "Export project backup", exact: true }).click(),
  ]);
  const saved = await readFile((await backup.path())!, "utf8");
  await project.getByRole("button", { name: "Reset synthetic project", exact: true }).click();
  await expect(project.getByRole("textbox", { name: "Synthetic project hypothesis", exact: true })).toHaveValue("");
  await project.getByText("Import synthetic dataset or project backup", { exact: true }).click();
  await project.getByLabel("Restore project file", { exact: true }).setInputFiles({ name: "project.json", mimeType: "application/json", buffer: Buffer.from(saved) });
  await expect(project.getByRole("textbox", { name: "Synthetic project hypothesis", exact: true })).toHaveValue("Saved synthetic processing hypothesis");
  await project.getByLabel("Import synthetic dataset", { exact: true }).setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"dataClass":"real"}') });
  await expect(project.getByRole("alert")).toBeVisible();
  // A failed import must leave the valid project untouched.
  await expect(project.getByRole("textbox", { name: "Synthetic project hypothesis", exact: true })).toHaveValue("Saved synthetic processing hypothesis");
  const replacement = JSON.parse(saved).dataset;
  replacement.version = "1.0.1";
  replacement.cohorts[0].responseCount = 40;
  await project.getByLabel("Import synthetic dataset", { exact: true }).setInputFiles({ name: "updated-synthetic.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(replacement)) });
  await expect(project.getByRole("status")).toContainText("Imported synthetic data");
  await expect(project.getByRole("region", { name: "Synthetic cohort comparison", exact: true })).toContainText("40/80 (50.0%)");
  await expect(project.getByRole("textbox", { name: "Synthetic project hypothesis", exact: true })).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
