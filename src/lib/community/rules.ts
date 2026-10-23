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

export function planModeration(input: { actorIsAdmin: boolean; action: string; reason: string }):
  | { ok: true; action: "hide" | "restore"; reason: string }
  | { ok: false; error: string } {
  if (!input.actorIsAdmin) {
    return { ok: false, error: "Only existing admins can moderate. Signup does not grant moderator." };
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
