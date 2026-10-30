/**
 * Shared Playwright helpers for authenticated ISI journeys.
 * Credentials come from env — never hard-coded. Missing creds → call sites must test.skip.
 */
import { expect, type Page } from "@playwright/test";

export type E2EUser = { email: string; password: string; label: string };

export function e2eUserA(): E2EUser | null {
  const email = process.env.E2E_USER_A_EMAIL?.trim();
  const password = process.env.E2E_USER_A_PASSWORD;
  if (!email || !password) return null;
  return { email, password, label: "A" };
}

export function e2eUserB(): E2EUser | null {
  const email = process.env.E2E_USER_B_EMAIL?.trim();
  const password = process.env.E2E_USER_B_PASSWORD;
  if (!email || !password) return null;
  return { email, password, label: "B" };
}

export function hasDualAuthCredentials(): boolean {
  return Boolean(e2eUserA() && e2eUserB());
}

export function hasSingleAuthCredentials(): boolean {
  return Boolean(e2eUserA() || (process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD));
}

/** Prefer A; fall back to legacy E2E_USER_* single-account vars. */
export function primaryE2EUser(): E2EUser | null {
  const a = e2eUserA();
  if (a) return a;
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) return null;
  return { email, password, label: "primary" };
}

export const SKIP_AUTH_DUAL =
  "SKIP (not a pass): set E2E_USER_A_EMAIL/PASSWORD and E2E_USER_B_EMAIL/PASSWORD for authenticated multi-account E2E";

export const SKIP_AUTH_SINGLE =
  "SKIP (not a pass): set E2E_USER_A_EMAIL/PASSWORD (or E2E_USER_EMAIL/PASSWORD) for authenticated E2E";

/** Email/password sign-in on /auth. Leaves the browser on post-auth redirect. */
export async function signInWithEmail(page: Page, user: E2EUser, redirect = "/research") {
  await page.goto(`/auth?redirect=${encodeURIComponent(redirect)}`);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
  // Ensure sign-in mode (not create account)
  const createToggle = page.getByRole("button", { name: /create one/i });
  if (await createToggle.isVisible().catch(() => false)) {
    // already on sign-in if "Create one" is shown
  } else {
    const signInToggle = page.getByRole("button", { name: /^sign in$/i });
    if (await signInToggle.isVisible().catch(() => false)) await signInToggle.click();
  }
  await page.getByLabel(/^email$/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill(user.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 45_000 });
}

export async function signOutIfPossible(page: Page) {
  const btn = page.getByRole("button", { name: /sign out/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}
