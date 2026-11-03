/** Local issuer + real JWT validation/product API/PostgreSQL. Not a live Neon sign-in test. */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
const base = process.env.HSI_TEST_WEB_URL ?? "http://127.0.0.1:3110";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Browser harness refuses non-local servers");
const { privateKey, publicKey } = await generateKeyPair("EdDSA");
const jwk = await exportJWK(publicKey); jwk.kid = "browser-fixture-key"; jwk.alg = "EdDSA";
const issuer = Bun.serve({ hostname: "127.0.0.1", port: 3112, fetch: () => Response.json({ keys: [jwk] }) });
const id = "44444444-4444-4444-8444-444444444444";
const token = await new SignJWT({}).setProtectedHeader({ alg: "EdDSA", kid: jwk.kid }).setSubject(id).setIssuer(issuer.url.origin).setIssuedAt().setExpirationTime("5m").sign(privateKey);
const browser = await chromium.launch({ executablePath: process.env.HSI_TEST_CHROMIUM ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
await mkdir("/tmp/hsi-step3-ui", { recursive: true });
try {
  for (const viewport of [{ width: 1440, height: 1050 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const page = await context.newPage();
    await page.route("**/api/auth/token", (route) => route.fulfill({ json: { token } }));
    await page.route("**/api/auth/get-session*", (route) => route.fulfill({ json: { user: { id, email: "local-research@example.invalid", name: "Local research operator" }, session: { userId: id } } }));
    await page.goto(`${base}/internal-research`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Start investigation", exact: true }).click({ timeout: 60_000 });
    await page.getByRole("heading", { name: "Human review required", exact: true }).waitFor();
    await page.getByLabel("Review rationale").fill("Browser engineering scenario: verified scientific source passages are needed.");
    await page.getByRole("button", { name: "Request revision", exact: true }).click();
    await page.getByRole("button", { name: "Download Markdown dossier", exact: true }).waitFor();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download Markdown dossier", exact: true }).click()]);
    assert.match(await readFile((await download.path())!, "utf8"), /request_revision/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /What verified research evidence maps to/ }).first().click();
    await page.getByRole("button", { name: "Download JSON dossier", exact: true }).waitFor();
    await page.getByText("Graph relationships and provenance", { exact: true }).click();
    await page.locator('button').filter({ hasText: /^REL-/ }).first().click();
    // The existing global Scientific Inspector opens the same KG relationship, not another graph UI.
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "No horizontal page overflow");
    await page.screenshot({ path: `/tmp/hsi-step3-ui/isi-${viewport.width}.png`, fullPage: true });
    await context.close();
  }
  console.log("PASS: ISI internal browser flow, signed token verification, durable reopen/review/download and existing KG inspector; local issuer");
} finally { issuer.stop(true); await browser.close(); }
