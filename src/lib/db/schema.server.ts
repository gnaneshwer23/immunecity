import { jsonb, pgEnum, pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["admin", "user"]);

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

export type EvidenceRecordRow = typeof evidenceRecords.$inferSelect;
