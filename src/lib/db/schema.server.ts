import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["admin", "user", "moderator", "reviewer"]);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    role: appRoleEnum("role").notNull(),
  },
  (t) => [unique().on(t.userId, t.role)],
);

export const evidenceRecords = pgTable("evidence_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  evidenceId: text("evidence_id").notNull().unique(),
  nodeId: text("node_id").notNull(),
  nodeName: text("node_name").notNull(),
  nodeType: text("node_type").notNull(),
  sourceType: text("source_type"),
  sourceRef: text("source_ref"),
  pmid: text("pmid"),
  doi: text("doi"),
  searchQuery: text("search_query"),
  manifestStatus: text("manifest_status").notNull().default("RESEARCH_REQUIRED"),
  checkStatus: text("check_status").notNull().default("pending"),
  checkDetail: jsonb("check_detail"),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  curation: text("curation").notNull().default("unreviewed"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  relationshipId: text("relationship_id"),
  claimSupport: text("claim_support").notNull().default("unassessed"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

/** Append-only curation decision history (IC-02). */
export const evidenceAuditEvents = pgTable("evidence_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  evidenceRecordId: uuid("evidence_record_id").notNull(),
  evidenceId: text("evidence_id").notNull(),
  actor: text("actor").notNull(),
  reason: text("reason").notNull(),
  previousState: jsonb("previous_state").notNull(),
  newState: jsonb("new_state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Optional durable claim-ledger candidates (migration 0007). Never auto Gate C. */
export const claimCandidates = pgTable("claim_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: text("claim_id").notNull().unique(),
  assertion: text("assertion").notNull(),
  subjectId: text("subject_id"),
  predicate: text("predicate"),
  objectId: text("object_id"),
  polarity: text("polarity").notNull().default("unassessed"),
  evidenceType: text("evidence_type").notNull().default("unspecified"),
  contextJson: jsonb("context_json").notNull().default({}),
  passageSpan: text("passage_span"),
  sourcePmid: text("source_pmid"),
  sourceDoi: text("source_doi"),
  lifecycle: text("lifecycle").notNull().default("candidate"),
  mappedRelationshipId: text("mapped_relationship_id"),
  extractionMeta: jsonb("extraction_meta").notNull().default({}),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Community MVP. Writes never touch evidence_records or the knowledge graph. */
export const communityProfiles = pgTable("community_profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  interests: text("interests").array(),
  affiliation: text("affiliation"),
  visibility: text("visibility").notNull().default("public"),
  credential: text("credential"),
  credentialStatus: text("credential_status").notNull().default("unverified"),
  notificationsPaused: boolean("notifications_paused").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityTopics = pgTable("community_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityMemberships = pgTable(
  "community_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id").notNull(),
    userId: uuid("user_id").notNull(),
    membershipRole: text("membership_role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("community_memberships_topic_user").on(t.topicId, t.userId)],
);

export const communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id").notNull(),
  authorId: uuid("author_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityComments = pgTable("community_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  parentId: uuid("parent_id"),
  authorId: uuid("author_id").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityReferences = pgTable("community_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  pmid: text("pmid"),
  doi: text("doi"),
  title: text("title"),
  journal: text("journal"),
  year: text("year"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  verificationDetail: text("verification_detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityEntityLinks = pgTable(
  "community_entity_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull(),
    conceptId: text("concept_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("community_entity_links_post_concept").on(t.postId, t.conceptId)],
);

export const communityReports = pgTable("community_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reporterId: uuid("reporter_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Signed-in Academy progress only. Does not reference evidence rows. */
export const academyMemberProgress = pgTable("academy_member_progress", {
  userId: uuid("user_id").primaryKey(),
  progress: jsonb("progress").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityPostRevisions = pgTable("community_post_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  editorId: uuid("editor_id").notNull(),
  previousBody: text("previous_body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communitySaves = pgTable(
  "community_saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("community_saves_user_target").on(t.userId, t.targetType, t.targetId)],
);

export const communityPostFollows = pgTable(
  "community_post_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("community_post_follows_post_user").on(t.postId, t.userId)],
);

export const communityAppeals = pgTable("community_appeals", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  appellantId: uuid("appellant_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  decisionReason: text("decision_reason"),
  decidedBy: uuid("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityNotifications = pgTable("community_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityJournalClubs = pgTable("community_journal_clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id").notNull(),
  postId: uuid("post_id").notNull().unique(),
  title: text("title").notNull(),
  agenda: text("agenda").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  facilitatorId: uuid("facilitator_id").notNull(),
  pmid: text("pmid"),
  doi: text("doi"),
  paperStatus: text("paper_status").notNull().default("unverified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Member id + an existing graph concept id. Not a community post save, and not a graph write. */
export const conceptSaves = pgTable(
  "concept_saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    conceptId: text("concept_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("concept_saves_user_concept").on(t.userId, t.conceptId)],
);

export const communityModerationActions = pgTable("community_moderation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  moderatorId: uuid("moderator_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EvidenceRecordRow = typeof evidenceRecords.$inferSelect;
export type EvidenceAuditEventRow = typeof evidenceAuditEvents.$inferSelect;
export type ClaimCandidateRow = typeof claimCandidates.$inferSelect;
