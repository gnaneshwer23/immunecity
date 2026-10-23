/* Browser-safe community rules. Tested without a database.
   Posts, likes and references must never become knowledge-graph writes. */
import { isPersonalClinical } from "@/lib/askGrounding";

export const POST_KINDS = ["question", "discussion", "paper", "hypothesis", "resource"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const POST_KIND_LABEL: Record<PostKind, string> = {
  question: "Question",
  discussion: "Discussion",
  paper: "Paper",
  hypothesis: "Hypothesis",
  resource: "Resource",
};

export const COMMUNITY_DISCLAIMER =
  "Educational discussion. Not clinical advice, and not part of the reviewed knowledge graph. A post stays in the community until a person reviews any scientific claim separately.";

/** Tables a community write is allowed to touch. */
export const COMMUNITY_WRITE_TABLES = [
  "community_profiles",
  "community_memberships",
  "community_posts",
  "community_comments",
  "community_references",
  "community_entity_links",
  "community_reports",
  "community_moderation_actions",
] as const;

/** Curated science and role tables. Community code must not insert or update these. */
export const COMMUNITY_FORBIDDEN_WRITES = [
  "evidence_records",
  "evidence_audit_events",
  "claim_candidates",
  "user_roles",
] as const;

const PATIENT_DETAIL = /\b(nhs\s*number|medical record number|mrn[:\s]|date of birth|my patient is|patient name is)\b/i;
const DOI_RE = /^10\.\d{4,9}\/\S+$/i;

export function membershipRoleForNewMember(): "member" {
  return "member";
}

export function postKindNote(kind: string): string | null {
  if (kind === "hypothesis") return "Community hypothesis. Not a reviewed claim and not added to the knowledge graph.";
  if (kind === "paper") return "Paper discussion. A resolved DOI or PMID is metadata only, not approval.";
  if (kind === "journal_club") {
    return "Journal club. The time is stored for this discussion thread. There is no live video room. A paper identifier stays unverified unless it already exists in approved evidence. This club does not change the knowledge graph.";
  }
  return null;
}

export function requireMember(userId: string | null | undefined): { ok: true; userId: string } | { ok: false; error: string } {
  const id = userId?.trim() ?? "";
  if (!id) return { ok: false, error: "Sign in to post, reply, or report. Visitors can read." };
  return { ok: true, userId: id };
}

export function displayNameFromIdentity(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (n && !n.includes("@") && n.length <= 80) return n;
  const local = (email ?? "").split("@")[0]?.replace(/[^\w .-]/g, "").trim();
  return (local || "Member").slice(0, 80);
}

export function validatePostDraft(input: { kind: string; title: string; body: string }):
  | { ok: true; kind: PostKind; title: string; body: string }
  | { ok: false; error: string } {
  if (!POST_KINDS.includes(input.kind as PostKind)) {
    return { ok: false, error: "Post type must be question, discussion, paper, hypothesis, or resource." };
  }
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 3 || title.length > 180) return { ok: false, error: "Title must be 3–180 characters." };
  if (body.length < 10 || body.length > 8000) return { ok: false, error: "Body must be 10–8000 characters." };
  const text = `${title}\n${body}`;
  if (PATIENT_DETAIL.test(text)) return { ok: false, error: "Remove identifiable patient details. This was not published." };
  if (isPersonalClinical(text)) {
    return { ok: false, error: "Personal medical advice is not published here. Ask a clinician, or rephrase as a general educational question." };
  }
  return { ok: true, kind: input.kind as PostKind, title, body };
}

export function validateCommentBody(body: string): { ok: true; body: string } | { ok: false; error: string } {
  const text = body.trim();
  if (text.length < 2 || text.length > 4000) return { ok: false, error: "Reply must be 2–4000 characters." };
  if (PATIENT_DETAIL.test(text)) return { ok: false, error: "Remove identifiable patient details. This was not published." };
  if (isPersonalClinical(text)) {
    return { ok: false, error: "Personal medical advice is not published here. Ask a clinician, or rephrase as a general educational question." };
  }
  return { ok: true, body: text };
}

export function validateReportReason(reason: string): { ok: true; reason: string } | { ok: false; error: string } {
  const text = reason.trim();
  if (text.length < 8 || text.length > 1000) return { ok: false, error: "Report reason must be 8–1000 characters." };
  return { ok: true, reason: text };
}

export function planModeration(input: { actorCanModerate: boolean; action: string; reason: string }):
  | { ok: true; action: "hide" | "restore"; reason: string }
  | { ok: false; error: string } {
  if (!input.actorCanModerate) {
    return { ok: false, error: "Only moderators can hide or restore posts." };
  }
  if (input.action !== "hide" && input.action !== "restore") {
    return { ok: false, error: "Moderation action must be hide or restore." };
  }
  const reason = input.reason.trim();
  if (reason.length < 8 || reason.length > 500) return { ok: false, error: "A moderation reason (8–500 characters) is required." };
  return { ok: true, action: input.action, reason };
}

export function planEntityLinks(ids: readonly string[], known: ReadonlySet<string>):
  | { ok: true; ids: string[] }
  | { ok: false; error: string } {
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id) continue;
    if (out.includes(id)) continue;
    if (!known.has(id)) {
      return { ok: false, error: `Unknown concept id ${id}. Links cannot create knowledge-graph concepts.` };
    }
    out.push(id);
    if (out.length > 8) return { ok: false, error: "Link at most 8 concepts." };
  }
  return { ok: true, ids: out };
}

export function parseCitationFields(raw: { pmid?: string | null; doi?: string | null }):
  | { ok: true; pmid: string | null; doi: string | null }
  | { ok: false; error: string } {
  const pmidIn = (raw.pmid ?? "").trim();
  const doiIn = (raw.doi ?? "").trim();
  if (!pmidIn && !doiIn) return { ok: true, pmid: null, doi: null };
  let pmid: string | null = null;
  let doi: string | null = null;
  if (pmidIn) {
    const p = pmidIn.replace(/^pmid[:\s]*/i, "");
    if (!/^\d{1,9}$/.test(p)) return { ok: false, error: "PMID must be digits. An identifier was not invented." };
    pmid = p;
  }
  if (doiIn) {
    const d = doiIn.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").replace(/[.)>,;]+$/, "");
    if (!DOI_RE.test(d)) return { ok: false, error: "DOI must look like 10.xxxx/…. An identifier was not invented." };
    doi = d;
  }
  return { ok: true, pmid, doi };
}

export interface CitationLookup {
  status: string;
  detail?: {
    reason?: string;
    candidate?: {
      title?: string;
      journal?: string;
      year?: string;
      doi?: string;
      pmid?: string;
    };
  };
}

export interface StoredCitation {
  pmid: string | null;
  doi: string | null;
  title: string | null;
  journal: string | null;
  year: string | null;
  verificationStatus: "unverified" | "matched" | "verified";
  verificationDetail: string;
}

function asText(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/** Keep the caller's identifier. Never fill a title or a different id when lookup fails. */
export function decideReferenceStorage(
  input: { pmid: string | null; doi: string | null },
  lookup: CitationLookup | { failed: true },
): StoredCitation {
  const base = {
    pmid: input.pmid,
    doi: input.doi,
    title: null as string | null,
    journal: null as string | null,
    year: null as string | null,
  };
  if ("failed" in lookup) {
    return {
      ...base,
      verificationStatus: "unverified",
      verificationDetail: "Lookup did not complete. The supplied identifier is stored as unverified.",
    };
  }
  const confirmed = lookup.status === "verified" || lookup.status === "matched";
  if (!confirmed) {
    const reason = asText(lookup.detail?.reason) ?? `Lookup status: ${lookup.status || "unknown"}`;
    return {
      ...base,
      verificationStatus: "unverified",
      verificationDetail: `${reason}. Stored as unverified.`.slice(0, 500),
    };
  }
  const candidate = lookup.detail?.candidate;
  let doi = input.doi;
  const candidateDoi = asText(candidate?.doi);
  if (candidateDoi && DOI_RE.test(candidateDoi)) {
    if (!doi) doi = candidateDoi;
    else if (doi.toLowerCase() !== candidateDoi.toLowerCase()) {
      return {
        ...base,
        verificationStatus: "unverified",
        verificationDetail: "Supplied DOI did not match the identifier lookup. Stored as unverified.",
      };
    }
  }
  const candidatePmid = asText(candidate?.pmid);
  if (input.pmid && candidatePmid && /^\d{1,9}$/.test(candidatePmid) && candidatePmid !== input.pmid) {
    return {
      ...base,
      verificationStatus: "unverified",
      verificationDetail: "Lookup returned a different PMID. The supplied identifier is stored as unverified.",
    };
  }
  const year = asText(candidate?.year, 32);
  return {
    pmid: input.pmid,
    doi,
    title: asText(candidate?.title),
    journal: asText(candidate?.journal),
    year: year ? year.slice(0, 4) : null,
    verificationStatus: lookup.status === "matched" ? "matched" : "verified",
    verificationDetail: lookup.status === "verified"
      ? "Identifier resolved. This is not a reviewed claim and is not in the knowledge graph."
      : "Identifier matched a metadata search. This is not a reviewed claim and is not in the knowledge graph.",
  };
}

/** Phase 3 tables. 0008 does not create these. Community code may write them and must not write curated evidence. */
export const COMMUNITY_PHASE3_WRITE_TABLES = [
  "community_post_revisions",
  "community_saves",
  "community_post_follows",
  "community_appeals",
  "community_notifications",
  "community_journal_clubs",
] as const;

export const JOURNAL_CLUB_POST_KIND = "journal_club" as const;

export const PROFILE_VISIBILITIES = ["public", "members"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const NOTIFICATION_KINDS = ["post_reply", "appeal_decision"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface CommunityProfileFields {
  userId: string;
  displayName: string;
  bio: string | null;
  interests: string[];
  affiliation: string | null;
  visibility: ProfileVisibility;
  credential: string | null;
  credentialStatus: "unverified";
  notificationsPaused: boolean;
}

export type SharedProfile = Omit<CommunityProfileFields, "notificationsPaused"> & {
  notificationsPaused?: boolean;
};

export type ProfileView =
  | { access: "full"; owner: boolean; profile: SharedProfile }
  | { access: "restricted"; visibility: "members" };

export function validateProfileDraft(input: {
  displayName: string;
  bio: string;
  interests: readonly string[];
  affiliation: string;
  visibility: string;
  credential: string;
  notificationsPaused: boolean;
  topicSlugs: ReadonlySet<string>;
}):
  | {
      ok: true;
      displayName: string;
      bio: string | null;
      interests: string[];
      affiliation: string | null;
      visibility: ProfileVisibility;
      credential: string | null;
      credentialStatus: "unverified";
      notificationsPaused: boolean;
    }
  | { ok: false; error: string } {
  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 80) {
    return { ok: false, error: "Display name must be 1–80 characters." };
  }
  if (displayName.includes("@")) return { ok: false, error: "Display name cannot be an email address." };
  const bio = input.bio.trim();
  if (bio.length > 500) return { ok: false, error: "Bio must be 500 characters or fewer." };
  const affiliation = input.affiliation.trim();
  if (affiliation.length > 120) return { ok: false, error: "Affiliation must be 120 characters or fewer." };
  const credential = input.credential.trim();
  if (credential.length > 160) return { ok: false, error: "Credential must be 160 characters or fewer." };
  if (input.visibility !== "public" && input.visibility !== "members") {
    return { ok: false, error: "Visibility must be public or members-only." };
  }
  if (typeof input.notificationsPaused !== "boolean") {
    return { ok: false, error: "Notification pause must be on or off." };
  }
  const interests: string[] = [];
  for (const raw of input.interests) {
    const slug = raw.trim();
    if (!slug) continue;
    if (!input.topicSlugs.has(slug)) return { ok: false, error: "Interests must be existing community topics." };
    if (!interests.includes(slug)) interests.push(slug);
    if (interests.length > 12) return { ok: false, error: "Choose at most 12 interests." };
  }
  const text = `${displayName}\n${bio}\n${affiliation}\n${credential}`;
  if (PATIENT_DETAIL.test(text)) return { ok: false, error: "Remove identifiable patient details from your profile." };
  if (isPersonalClinical(text)) {
    return { ok: false, error: "Personal medical advice does not belong on a profile." };
  }
  return {
    ok: true,
    displayName,
    bio: bio || null,
    interests,
    affiliation: affiliation || null,
    visibility: input.visibility,
    credential: credential || null,
    credentialStatus: "unverified",
    notificationsPaused: input.notificationsPaused,
  };
}

/** Members-only profiles stay hidden from visitors. Pause state stays with the owner. Credential is never marked verified. */
export function profileViewFor(
  profile: CommunityProfileFields,
  viewer: { signedIn: boolean; userId: string | null },
): ProfileView {
  const owner = Boolean(viewer.userId) && viewer.userId === profile.userId;
  if (profile.visibility === "members" && !viewer.signedIn) {
    return { access: "restricted", visibility: "members" };
  }
  const safe: CommunityProfileFields = { ...profile, credentialStatus: "unverified" };
  if (!owner) {
    const { notificationsPaused: _paused, ...shared } = safe;
    return { access: "full", owner: false, profile: shared };
  }
  return { access: "full", owner: true, profile: safe };
}

function validatePostBody(body: string): { ok: true; body: string } | { ok: false; error: string } {
  const text = body.trim();
  if (text.length < 10 || text.length > 8000) return { ok: false, error: "Body must be 10–8000 characters." };
  if (PATIENT_DETAIL.test(text)) return { ok: false, error: "Remove identifiable patient details. This was not published." };
  if (isPersonalClinical(text)) {
    return { ok: false, error: "Personal medical advice is not published here. Ask a clinician, or rephrase as a general educational question." };
  }
  return { ok: true, body: text };
}

/** Author-only body edit. Stores the previous body. Hidden posts stay hidden. */
export function planPostEdit(input: {
  actorId: string;
  authorId: string;
  currentBody: string;
  nextBody: string;
  status: string;
}):
  | { ok: true; previousBody: string; nextBody: string; status: "visible" | "hidden" }
  | { ok: false; error: string } {
  if (!input.actorId || input.actorId !== input.authorId) {
    return { ok: false, error: "Only the author can edit this post." };
  }
  if (input.status !== "visible" && input.status !== "hidden") {
    return { ok: false, error: "Post status is not editable." };
  }
  const next = validatePostBody(input.nextBody);
  if (!next.ok) return next;
  if (next.body === input.currentBody.trim()) return { ok: false, error: "Body is unchanged." };
  return { ok: true, previousBody: input.currentBody, nextBody: next.body, status: input.status };
}

export function planSaveTarget(input: { signedIn: boolean; targetType: string }):
  | { ok: true; targetType: "post" | "comment" }
  | { ok: false; error: string } {
  if (!input.signedIn) return { ok: false, error: "Sign in to save a post or reply." };
  if (input.targetType !== "post" && input.targetType !== "comment") {
    return { ok: false, error: "Save a post or a reply." };
  }
  return { ok: true, targetType: input.targetType };
}

export function planPostFollow(input: { signedIn: boolean }): { ok: true } | { ok: false; error: string } {
  if (!input.signedIn) return { ok: false, error: "Sign in to follow a post." };
  return { ok: true };
}

export function planAppeal(input: {
  signedIn: boolean;
  targetStatus: "visible" | "hidden" | "missing";
  reason: string;
  openAppealExists: boolean;
}): { ok: true; reason: string } | { ok: false; error: string } {
  if (!input.signedIn) return { ok: false, error: "Sign in to appeal. Visitors cannot appeal." };
  if (input.targetStatus === "missing") return { ok: false, error: "That post or comment was not found." };
  if (input.targetStatus !== "hidden") return { ok: false, error: "Only a hidden post or comment can be appealed." };
  const reason = input.reason.trim();
  if (reason.length < 8 || reason.length > 500) return { ok: false, error: "Appeal reason must be 8–500 characters." };
  if (input.openAppealExists) return { ok: false, error: "You already have an open appeal for this item." };
  return { ok: true, reason };
}

export function planAppealDecision(input: {
  actorCanModerate: boolean;
  decision: string;
  reason: string;
  appealOpen: boolean;
}):
  | { ok: true; decision: "uphold" | "restore"; reason: string; nextStatus: "hidden" | "visible" }
  | { ok: false; error: string } {
  if (!input.actorCanModerate) {
    return { ok: false, error: "Only moderators can decide an appeal." };
  }
  if (!input.appealOpen) return { ok: false, error: "That appeal is already decided." };
  if (input.decision !== "uphold" && input.decision !== "restore") {
    return { ok: false, error: "Decision must be uphold or restore." };
  }
  const reason = input.reason.trim();
  if (reason.length < 8 || reason.length > 500) {
    return { ok: false, error: "A decision reason (8–500 characters) is required." };
  }
  return {
    ok: true,
    decision: input.decision,
    reason,
    nextStatus: input.decision === "restore" ? "visible" : "hidden",
  };
}

/** Followers of a post, except the person who replied and anyone who paused notifications. */
export function replyNotificationRecipients(input: {
  followerIds: readonly string[];
  authorId: string;
  pausedUserIds: ReadonlySet<string>;
}): string[] {
  const out: string[] = [];
  for (const id of input.followerIds) {
    if (!id || id === input.authorId) continue;
    if (input.pausedUserIds.has(id)) continue;
    if (out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

export function appealDecisionRecipient(input: { appellantId: string; paused: boolean }): string | null {
  if (!input.appellantId || input.paused) return null;
  return input.appellantId;
}

export function parseScheduledAt(raw: string): { ok: true; iso: string } | { ok: false; error: string } {
  const ms = Date.parse(raw.trim());
  if (!Number.isFinite(ms)) return { ok: false, error: "Scheduled time must be a real date." };
  const year = new Date(ms).getUTCFullYear();
  if (year < 2020 || year > 2100) return { ok: false, error: "Scheduled time is out of range." };
  return { ok: true, iso: new Date(ms).toISOString() };
}

/** Facilitator is the creator, or another person who is already a moderator. This does not grant a role. */
export function planJournalClub(input: {
  actorCanModerate: boolean;
  actorId: string;
  title: string;
  agenda: string;
  scheduledAt: string;
  requestedFacilitatorId: string | null;
  requestedFacilitatorCanModerate: boolean;
  pmid?: string | null;
  doi?: string | null;
}):
  | {
      ok: true;
      title: string;
      agenda: string;
      scheduledAt: string;
      facilitatorId: string;
      membershipRole: "member";
      postKind: typeof JOURNAL_CLUB_POST_KIND;
      pmid: string | null;
      doi: string | null;
    }
  | { ok: false; error: string } {
  if (!input.actorCanModerate) {
    return { ok: false, error: "Only moderators can schedule a journal club." };
  }
  const title = input.title.trim();
  const agenda = input.agenda.trim();
  if (title.length < 3 || title.length > 180) return { ok: false, error: "Title must be 3–180 characters." };
  if (agenda.length < 10 || agenda.length > 4000) return { ok: false, error: "Agenda must be 10–4000 characters." };
  const when = parseScheduledAt(input.scheduledAt);
  if (!when.ok) return when;
  const text = `${title}\n${agenda}`;
  if (PATIENT_DETAIL.test(text)) return { ok: false, error: "Remove identifiable patient details. This was not published." };
  if (isPersonalClinical(text)) {
    return { ok: false, error: "Personal medical advice is not published here. Ask a clinician, or rephrase as a general educational question." };
  }
  const citation = parseCitationFields({ pmid: input.pmid, doi: input.doi });
  if (!citation.ok) return citation;
  const requested = input.requestedFacilitatorId?.trim() || input.actorId;
  if (requested !== input.actorId && !input.requestedFacilitatorCanModerate) {
    return { ok: false, error: "The facilitator must already be a moderator." };
  }
  return {
    ok: true,
    title,
    agenda,
    scheduledAt: when.iso,
    facilitatorId: requested,
    membershipRole: membershipRoleForNewMember(),
    postKind: JOURNAL_CLUB_POST_KIND,
    pmid: citation.pmid,
    doi: citation.doi,
  };
}

/** Match an approved evidence identifier only. Never invent a title or a PMID. */
export function paperStatusForClub(input: {
  pmid: string | null;
  doi: string | null;
  approvedMatch: boolean;
}): { paperStatus: "unverified" | "matched"; detail: string; title: null } {
  if (!input.pmid && !input.doi) {
    return { paperStatus: "unverified", detail: "No paper identifier was supplied.", title: null };
  }
  if (input.approvedMatch) {
    return {
      paperStatus: "matched",
      detail: "This identifier is already on an approved evidence record. The journal club does not change that record.",
      title: null,
    };
  }
  return {
    paperStatus: "unverified",
    detail: "Stored as unverified. It was not found on an approved evidence record, and no identifier was invented.",
    title: null,
  };
}

/** Concept saves live in their own table. They are not community post saves. */
export const CONCEPT_SAVE_TABLE = "concept_saves" as const;

export type WorkspaceConceptSave = { userId: string; conceptId: string };
export type WorkspaceTopicFollow = { userId: string; slug: string; title: string };
export type WorkspacePostRow = { id: string; title: string; authorId: string; status: string };
export type WorkspacePostFollow = { userId: string; postId: string };

/** Accept a signed-in member and a concept id that already exists. Never adds a graph node. */
export function planConceptSave(input: {
  userId: string | null | undefined;
  conceptId: string;
  known: ReadonlySet<string>;
}): { ok: true; userId: string; conceptId: string } | { ok: false; error: string } {
  const userId = input.userId?.trim() ?? "";
  if (!userId) return { ok: false, error: "Sign in to save a concept." };
  const conceptId = input.conceptId.trim();
  if (!conceptId || !input.known.has(conceptId)) {
    return {
      ok: false,
      error: `Unknown concept id ${conceptId || "(blank)"}. Saving a concept cannot create a knowledge-graph node.`,
    };
  }
  return { ok: true, userId, conceptId };
}

/** Toggle one member's save. Another member's rows stay. An unknown id leaves the list unchanged. */
export function toggleMemberConceptSave(
  saves: readonly WorkspaceConceptSave[],
  input: { userId: string | null | undefined; conceptId: string; known: ReadonlySet<string> },
): { ok: true; saved: boolean; saves: WorkspaceConceptSave[] } | { ok: false; error: string; saves: readonly WorkspaceConceptSave[] } {
  const plan = planConceptSave(input);
  if (!plan.ok) return { ok: false, error: plan.error, saves };
  const exists = saves.some((row) => row.userId === plan.userId && row.conceptId === plan.conceptId);
  const next = exists
    ? saves.filter((row) => !(row.userId === plan.userId && row.conceptId === plan.conceptId))
    : [...saves, { userId: plan.userId, conceptId: plan.conceptId }];
  return { ok: true, saved: !exists, saves: next };
}

export function conceptIdsSavedBy(saves: readonly WorkspaceConceptSave[], userId: string): string[] {
  const ids: string[] = [];
  for (const row of saves) {
    if (row.userId !== userId || ids.includes(row.conceptId)) continue;
    ids.push(row.conceptId);
  }
  return ids;
}

/** One member's workspace. Other members' saves, follows and posts are left out. Unknown concept ids are dropped. */
export function workspaceForMember(input: {
  userId: string;
  conceptSaves: readonly WorkspaceConceptSave[];
  topicFollows: readonly WorkspaceTopicFollow[];
  posts: readonly WorkspacePostRow[];
  postFollows: readonly WorkspacePostFollow[];
  known: ReadonlySet<string>;
}): {
  concepts: { id: string }[];
  topics: { slug: string; title: string }[];
  discussions: { id: string; title: string; wrote: boolean; follows: boolean; hidden: boolean }[];
} {
  const concepts: { id: string }[] = [];
  const seenConcepts = new Set<string>();
  for (const row of input.conceptSaves) {
    if (row.userId !== input.userId || !input.known.has(row.conceptId) || seenConcepts.has(row.conceptId)) continue;
    seenConcepts.add(row.conceptId);
    concepts.push({ id: row.conceptId });
  }
  const topics: { slug: string; title: string }[] = [];
  const seenTopics = new Set<string>();
  for (const row of input.topicFollows) {
    if (row.userId !== input.userId || seenTopics.has(row.slug)) continue;
    seenTopics.add(row.slug);
    topics.push({ slug: row.slug, title: row.title });
  }
  const followed = new Set(input.postFollows.filter((row) => row.userId === input.userId).map((row) => row.postId));
  const discussions: { id: string; title: string; wrote: boolean; follows: boolean; hidden: boolean }[] = [];
  const seenPosts = new Set<string>();
  for (const post of input.posts) {
    const wrote = post.authorId === input.userId;
    const follows = followed.has(post.id);
    if ((!wrote && !follows) || seenPosts.has(post.id)) continue;
    seenPosts.add(post.id);
    discussions.push({
      id: post.id,
      title: post.title,
      wrote,
      follows,
      hidden: post.status === "hidden",
    });
  }
  return { concepts, topics, discussions };
}
