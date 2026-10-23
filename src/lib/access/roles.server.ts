import { getSqlClient } from "@/lib/db.server";
import { accountPowers, type AccountPowers } from "@/lib/access/roles";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Read stored role labels. Fails closed: a lookup error grants no extra power. */
export async function loadAccountPowers(userId: string | null | undefined): Promise<AccountPowers> {
  const id = userId?.trim() ?? "";
  if (!id) return accountPowers([], false);
  if (!UUID_RE.test(id)) return accountPowers([], true);
  try {
    // getSqlClient() returns the postgres tag. Invoking getSqlClient itself as the tag
    // never runs the query, and the catch then treats every admin as a member.
    const sql = getSqlClient();
    const rows = await sql<{ role: string }[]>`
      SELECT role::text AS role FROM public.user_roles WHERE user_id = ${id}::uuid
    `;
    return accountPowers(rows.map((row) => String(row.role)), true);
  } catch {
    return accountPowers([], true);
  }
}

export async function assertCanModerate(userId: string): Promise<void> {
  const powers = await loadAccountPowers(userId);
  if (!powers.moderator) {
    throw new Error("Only moderators can hide or restore community posts. Signup does not grant moderator.");
  }
}

export async function assertCanReview(userId: string): Promise<void> {
  const powers = await loadAccountPowers(userId);
  if (!powers.reviewer) {
    throw new Error("Only scientific reviewers and administrators can change curation records. Signup does not grant that role.");
  }
}

export async function assertAdministrator(userId: string): Promise<void> {
  const powers = await loadAccountPowers(userId);
  if (!powers.administrator) {
    throw new Error("Only administrators can run that action. Signup does not grant administrator.");
  }
}
