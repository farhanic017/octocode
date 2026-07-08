import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core"

export const EpisodicMemoryTable = sqliteTable(
  "episodic_memory",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    timestamp: integer().notNull(),
    session_id: text().notNull().default(""),
    task_type: text().notNull(),
    outcome: text().notNull(),
    title: text().notNull(),
    summary: text().notNull(),
    details: text().notNull().default(""),
    tags: text().notNull().default(""),
    duration_ms: integer().notNull().default(0),
    files_changed: text().notNull().default(""),
    error_message: text().notNull().default(""),
    retry_count: integer().notNull().default(0),
    confidence: real().notNull().default(1.0),
    scope: text().notNull().default("project"),
    scope_id: text().notNull().default(""),
  },
  (table) => [
    index("episodic_timestamp_idx").on(table.timestamp),
    index("episodic_outcome_idx").on(table.outcome),
    index("episodic_task_type_idx").on(table.task_type),
    index("episodic_scope_idx").on(table.scope, table.scope_id),
    index("episodic_session_idx").on(table.session_id),
  ],
)

export type EpisodicMemoryRow = typeof EpisodicMemoryTable.$inferSelect
export type EpisodicMemoryInsert = typeof EpisodicMemoryTable.$inferInsert
