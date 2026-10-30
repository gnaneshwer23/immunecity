import { boolean, doublePrecision, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

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

/** Ask gate outcomes only. No question text and no confidence score. */
export const aiEvaluationRuns = pgTable("ai_evaluation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  outcome: text("outcome").notNull(),
  reasonCode: text("reason_code").notNull(),
  questionRedacted: boolean("question_redacted").notNull(),
  /** Ask PROMPT_VERSION at log time — for outcome rates by prompt; never question text. */
  promptVersion: text("prompt_version").notNull().default("unknown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityModerationActions = pgTable("community_moderation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  moderatorId: uuid("moderator_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Melanoma-pilot Trial Intelligence (migration 0015 + 0018 treatment_line). Additive; not claim approval. */
export const clinicalTrials = pgTable("clinical_trials", {
  id: uuid("id").primaryKey().defaultRandom(),
  trialId: text("trial_id").notNull().unique(),
  graphNodeId: text("graph_node_id").notNull(),
  nctId: text("nct_id"),
  acronym: text("acronym").notNull(),
  title: text("title").notNull(),
  phase: text("phase"),
  design: text("design"),
  sponsor: text("sponsor"),
  status: text("status"),
  conditionLabel: text("condition_label"),
  populationSummary: text("population_summary"),
  analysisSetNote: text("analysis_set_note"),
  /** Curated facet (0018); seeded from fixtures — never regex-inferred. */
  treatmentLine: text("treatment_line"),
  verificationState: text("verification_state").notNull().default("unverified"),
  primaryPmid: text("primary_pmid"),
  primaryDoi: text("primary_doi"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trialArms = pgTable("trial_arms", {
  id: uuid("id").primaryKey().defaultRandom(),
  armId: text("arm_id").notNull().unique(),
  trialId: text("trial_id").notNull(),
  label: text("label").notNull(),
  regimen: text("regimen").notNull(),
  doseSchedule: text("dose_schedule"),
  comparatorRole: text("comparator_role").notNull().default("experimental"),
  enrolledN: integer("enrolled_n"),
  treatedN: integer("treated_n"),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Optional arm-level line (0018); null when only trial-level is curated. */
  treatmentLine: text("treatment_line"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const endpointResults = pgTable("endpoint_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  resultId: text("result_id").notNull().unique(),
  armId: text("arm_id").notNull(),
  endpointType: text("endpoint_type").notNull(),
  label: text("label").notNull(),
  valueNum: doublePrecision("value_num"),
  valueText: text("value_text"),
  unit: text("unit"),
  ciLower: doublePrecision("ci_lower"),
  ciUpper: doublePrecision("ci_upper"),
  pValue: text("p_value"),
  timepoint: text("timepoint"),
  analysisSet: text("analysis_set"),
  followUp: text("follow_up"),
  populationNote: text("population_note"),
  verificationState: text("verification_state").notNull().default("unverified"),
  sourcePmid: text("source_pmid"),
  sourceDoi: text("source_doi"),
  sourceLocator: text("source_locator"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Phase 2 / E ISI-A07 light stub — biomarker / assay tables are not migrated yet.
 * Fixture `biomarkerContext: []` holds the browser-safe slot; do not invent assays or cut-offs.
 * Graph BIOMARKER nodes may still surface via translational edges without assay rows.
 * Future (when curated PMIDs exist): trial_biomarkers, biomarker_assays linked to graph BIOMARKER ids.
 */

/** Phase 4 Research Workbench — member evidence collections (migration 0016). Never a KG write. */
export const evidenceCollections = pgTable("evidence_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  conceptIds: text("concept_ids").array().notNull().default([]),
  evidenceRefs: text("evidence_refs").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EvidenceRecordRow = typeof evidenceRecords.$inferSelect;
export type EvidenceAuditEventRow = typeof evidenceAuditEvents.$inferSelect;
export type ClaimCandidateRow = typeof claimCandidates.$inferSelect;
export type ClinicalTrialRow = typeof clinicalTrials.$inferSelect;
export type TrialArmRow = typeof trialArms.$inferSelect;
export type EndpointResultRow = typeof endpointResults.$inferSelect;
export type EvidenceCollectionRow = typeof evidenceCollections.$inferSelect;

/**
 * Phase B — Ontology crosswalks retaining ISI ids (migration 0017).
 * Not a second KG. Curator-supplied external ids only — never invent accessions.
 */
export const ontologyMappings = pgTable(
  "ontology_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    isiId: text("isi_id").notNull(),
    system: text("system").notNull(),
    externalId: text("external_id").notNull(),
    label: text("label"),
    reviewStatus: text("review_status").notNull().default("unreviewed"),
    notes: text("notes"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("ontology_mappings_isi_ext_uniq").on(t.isiId, t.system, t.externalId)],
);

/** Phase B — append-only graph provenance / release notes (not claim approval). */
export const graphProvenanceEvents = pgTable("graph_provenance_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityKind: text("entity_kind").notNull(),
  isiId: text("isi_id"),
  relationshipId: text("relationship_id"),
  graphCoreVersion: text("graph_core_version").notNull(),
  graphExtensionsVersion: text("graph_extensions_version"),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull().default("system"),
  detail: jsonb("detail").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OntologyMappingRow = typeof ontologyMappings.$inferSelect;
export type GraphProvenanceEventRow = typeof graphProvenanceEvents.$inferSelect;

/**
 * Discovery Intelligence — research profiles (migration 0019 + 0022 entitlement check).
 * Ownership-scoped; entitlement stub free|researcher_pro|team|enterprise (no Stripe).
 * Orthogonal to user_roles. No required sensitive PII.
 */
export const researchProfiles = pgTable("research_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  displayLabel: text("display_label"),
  focusDiseases: text("focus_diseases").array().notNull().default([]),
  focusDomains: text("focus_domains").array().notNull().default([]),
  modalities: text("modalities").array().notNull().default([]),
  interestsJson: jsonb("interests_json").notNull().default({}),
  entitlement: text("entitlement").notNull().default("free"),
  entitlementNotes: text("entitlement_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Discovery Intelligence — research gaps (migration 0020).
 * Detection emits candidate | coverage_insufficient only; reviewed_gap is human-only.
 */
export const researchGaps = pgTable("research_gaps", {
  id: uuid("id").primaryKey().defaultRandom(),
  gapKey: text("gap_key").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull().default("candidate"),
  pilot: text("pilot"),
  subjectId: text("subject_id"),
  objectId: text("object_id"),
  relationshipId: text("relationship_id"),
  diseaseId: text("disease_id"),
  whyItMatters: text("why_it_matters"),
  searchScopeJson: jsonb("search_scope_json").notNull().default({}),
  detectionSource: text("detection_source").notNull(),
  detectionDetail: jsonb("detection_detail").notNull().default({}),
  coverageLabel: text("coverage_label"),
  createdBy: text("created_by").notNull().default("system"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchGapCandidates = pgTable("research_gap_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  gapKey: text("gap_key").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  emittedAt: timestamp("emitted_at", { withTimezone: true }).notNull().defaultNow(),
  ingestedGapId: uuid("ingested_gap_id"),
});

export const researchGapEvidenceLinks = pgTable("research_gap_evidence_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  gapId: uuid("gap_id").notNull(),
  evidenceId: text("evidence_id"),
  relationshipId: text("relationship_id"),
  pmid: text("pmid"),
  doi: text("doi"),
  linkRole: text("link_role").notNull().default("background"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchGapReviews = pgTable("research_gap_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  gapId: uuid("gap_id").notNull(),
  actor: text("actor").notNull(),
  decision: text("decision").notNull(),
  rationale: text("rationale").notNull(),
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchGapVersions = pgTable("research_gap_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  gapId: uuid("gap_id").notNull(),
  versionN: integer("version_n").notNull(),
  snapshotJson: jsonb("snapshot_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchSearchCoverage = pgTable("research_search_coverage", {
  id: uuid("id").primaryKey().defaultRandom(),
  gapId: uuid("gap_id"),
  conceptId: text("concept_id"),
  relationshipId: text("relationship_id"),
  searchAttempted: boolean("search_attempted").notNull().default(false),
  hitCount: integer("hit_count"),
  queryText: text("query_text"),
  scopeNote: text("scope_note").notNull(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchGapSubscriptions = pgTable(
  "research_gap_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    gapId: uuid("gap_id").notNull(),
    channel: text("channel").notNull().default("in_app"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("research_gap_subscriptions_uniq").on(t.userId, t.gapId, t.channel)],
);

export const researchGapFeedback = pgTable("research_gap_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  gapId: uuid("gap_id").notNull(),
  userId: uuid("user_id").notNull(),
  rating: text("rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchGapChangeEvents = pgTable("research_gap_change_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  gapId: uuid("gap_id"),
  eventType: text("event_type").notNull(),
  detail: jsonb("detail").notNull().default({}),
  actor: text("actor").notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Discovery Intelligence Phase 6 — in-app alerts + monitor runs (migration 0021).
 * Email deferred. Dedupe by (user_id, dedupe_key).
 */
export const researchDiscoveryAlerts = pgTable(
  "research_discovery_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    gapId: uuid("gap_id"),
    gapKey: text("gap_key"),
    dedupeKey: text("dedupe_key").notNull(),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("research_discovery_alerts_dedupe_uniq").on(t.userId, t.dedupeKey)],
);

export const researchMonitorRuns = pgTable("research_monitor_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"),
  actor: text("actor").notNull().default("system"),
  mode: text("mode").notNull().default("stub"),
  detail: jsonb("detail").notNull().default({}),
});

/**
 * SME workspace — gold labels + work-item audit (migration 0023).
 * Labels/scores stay null until a scientific reviewer fills them. Never Gate C auto-approve.
 */
export const smeGoldLabels = pgTable("sme_gold_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: text("case_id").notNull().unique(),
  workItemId: text("work_item_id"),
  gapKey: text("gap_key"),
  label: text("label"),
  smeScore: doublePrecision("sme_score"),
  notes: text("notes"),
  reviewer: text("reviewer"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const smeWorkItemEvents = pgTable("sme_work_item_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workItemId: text("work_item_id").notNull(),
  relationshipId: text("relationship_id"),
  evidenceId: text("evidence_id"),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  rationale: text("rationale").notNull(),
  payloadJson: jsonb("payload_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ResearchProfileDbRow = typeof researchProfiles.$inferSelect;
export type ResearchGapDbRow = typeof researchGaps.$inferSelect;
export type ResearchDiscoveryAlertDbRow = typeof researchDiscoveryAlerts.$inferSelect;
export type SmeGoldLabelDbRow = typeof smeGoldLabels.$inferSelect;
