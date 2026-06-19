import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Os `text` de status/tipo usam `$type` para herdar a tipagem dos contratos
// compartilhados, mas ficam como `text` no banco para evitar a dor de migrar
// enums do Postgres. A validacao forte continua no `packages/shared` (Zod).

type InputType = "url" | "image";
type PageType = "landing_page" | "homepage" | "waitlist" | "lead_capture";
type Goal = "lead_generation" | "click_through" | "sign_up" | "awareness";
type AnalysisStatus =
  | "pending"
  | "capturing"
  | "processing"
  | "reporting"
  | "completed"
  | "failed";
type ViewportType = "desktop" | "mobile";
type JobStatus = "queued" | "processing" | "done" | "failed";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  inputType: text("input_type").$type<InputType>().notNull(),
  pageType: text("page_type").$type<PageType>().notNull(),
  goal: text("goal").$type<Goal>().notNull(),
  status: text("status").$type<AnalysisStatus>().default("pending").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const analysisInputs = pgTable("analysis_inputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  url: text("url"),
  uploadedFilePath: text("uploaded_file_path"),
  sourceLabel: text("source_label"),
});

export const viewports = pgTable("viewports", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  type: text("type").$type<ViewportType>().notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
});

export const artifacts = pgTable("artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  viewportId: uuid("viewport_id").references(() => viewports.id, { onDelete: "cascade" }),
  artifactType: text("artifact_type").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const detectedElements = pgTable("detected_elements", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  viewportId: uuid("viewport_id")
    .notNull()
    .references(() => viewports.id, { onDelete: "cascade" }),
  elementType: text("element_type").notNull(),
  label: text("label"),
  bboxX: real("bbox_x").notNull(),
  bboxY: real("bbox_y").notNull(),
  bboxW: real("bbox_w").notNull(),
  bboxH: real("bbox_h").notNull(),
  aboveFold: boolean("above_fold").notNull(),
  contrastScore: real("contrast_score"),
  attentionShare: real("attention_share"),
});

export const attentionSummaries = pgTable("attention_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  viewportId: uuid("viewport_id")
    .notNull()
    .references(() => viewports.id, { onDelete: "cascade" }),
  primaryRegions: jsonb("primary_regions")
    .$type<Array<{ x: number; y: number; intensity: number }>>()
    .default([])
    .notNull(),
  gazePath: jsonb("gaze_path")
    .$type<Array<{ x: number; y: number; order: number }>>()
    .default([])
    .notNull(),
});

export const uxScores = pgTable("ux_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  viewportId: uuid("viewport_id")
    .notNull()
    .references(() => viewports.id, { onDelete: "cascade" }),
  ctaVisibility: real("cta_visibility").notNull(),
  headlineAttention: real("headline_attention").notNull(),
  visualHierarchy: real("visual_hierarchy").notNull(),
  attentionCompetition: real("attention_competition").notNull(),
  aboveTheFoldEfficiency: real("above_the_fold_efficiency").notNull(),
  clutterScore: real("clutter_score").notNull(),
});

export const aiReports = pgTable("ai_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  viewportId: uuid("viewport_id").references(() => viewports.id, { onDelete: "cascade" }),
  modelName: text("model_name").notNull(),
  summary: text("summary").notNull(),
  issues: jsonb("issues").$type<string[]>().default([]).notNull(),
  recommendations: jsonb("recommendations").$type<string[]>().default([]).notNull(),
  abTestHypotheses: jsonb("ab_test_hypotheses").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const comparisons = pgTable("comparisons", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  baseAnalysisId: uuid("base_analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  targetAnalysisId: uuid("target_analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  summary: text("summary"),
  deltaScores: jsonb("delta_scores").$type<Record<string, number>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Fila de jobs no proprio Postgres. O worker consome com
// `FOR UPDATE SKIP LOCKED` (Fase 1). `run_after` habilita backoff de retry.
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    type: text("type").default("analyze").notNull(),
    status: text("status").$type<JobStatus>().default("queued").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    runAfter: timestamp("run_after", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("jobs_status_run_after_idx").on(table.status, table.runAfter)],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  analyses: many(analyses),
  comparisons: many(comparisons),
}));

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  project: one(projects, { fields: [analyses.projectId], references: [projects.id] }),
  inputs: many(analysisInputs),
  viewports: many(viewports),
  artifacts: many(artifacts),
  detectedElements: many(detectedElements),
  attentionSummaries: many(attentionSummaries),
  uxScores: many(uxScores),
  aiReports: many(aiReports),
  jobs: many(jobs),
}));

export const viewportsRelations = relations(viewports, ({ one, many }) => ({
  analysis: one(analyses, { fields: [viewports.analysisId], references: [analyses.id] }),
  artifacts: many(artifacts),
  detectedElements: many(detectedElements),
}));
