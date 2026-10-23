/**
 * Account powers for Immune Super Intelligence.
 * Stored values in user_roles stay short: `user`, `moderator`, `reviewer`, `admin`.
 * Visitor is logged out and has no row. Signup still inserts only `user`.
 * Administrator (`admin`) keeps moderator and scientific-reviewer power.
 * Nothing here promotes a member.
 */

export const STORED_MEMBER_ROLE = "user";
export const STORED_MODERATOR_ROLE = "moderator";
export const STORED_REVIEWER_ROLE = "reviewer";
export const STORED_ADMIN_ROLE = "admin";

export interface AccountPowers {
  /** Logged out. No user_roles row. */
  visitor: boolean;
  /** Signed in. A normal member is stored as `user`. */
  member: boolean;
  /** Hide or restore community posts. */
  moderator: boolean;
  /** Use the curation review queue. Does not auto-approve. */
  reviewer: boolean;
  /** Stored role `admin`. */
  administrator: boolean;
}

export function accountPowers(storedRoles: readonly string[], signedIn: boolean): AccountPowers {
  const roles = new Set(storedRoles);
  const administrator = signedIn && roles.has(STORED_ADMIN_ROLE);
  return {
    visitor: !signedIn,
    member: signedIn,
    moderator: signedIn && (administrator || roles.has(STORED_MODERATOR_ROLE)),
    reviewer: signedIn && (administrator || roles.has(STORED_REVIEWER_ROLE)),
    administrator,
  };
}

/** Label for signed-in chrome. Visitors are not a stored role. */
export function accountLabel(powers: AccountPowers): string {
  if (powers.visitor || !powers.member) return "visitor";
  if (powers.administrator) return "administrator";
  if (powers.reviewer && powers.moderator) return "reviewer and moderator";
  if (powers.reviewer) return "scientific reviewer";
  if (powers.moderator) return "moderator";
  return "member";
}
