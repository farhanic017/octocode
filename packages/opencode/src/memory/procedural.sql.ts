import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core"

export const ProceduralMemoryTable = sqliteTable(
  "procedural_memory",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    created_at: integer().notNull(),
    updated_at: integer().notNull(),
    skill_name: text().notNull(),
    pattern: text().notNull(),
    description: text().notNull(),
    steps: text().notNull().default(""),
    file_template: text().notNull().default(""),
    tags: text().notNull().default(""),
    use_count: integer().notNull().default(1),
    success_rate: real().notNull().default(1.0),
    avg_duration_ms: integer().notNull().default(0),
    last_used_at: integer().notNull().default(0),
    scope: text().notNull().default("project"),
    scope_id: text().notNull().default(""),
    source: text().notNull().default("auto"),
    confidence: real().notNull().default(0.5),
    status: text().notNull().default("draft"),
  },
  (table) => [
    index("procedural_skill_idx").on(table.skill_name),
    index("procedural_pattern_idx").on(table.pattern),
    index("procedural_scope_idx").on(table.scope, table.scope_id),
    index("procedural_status_idx").on(table.status),
    index("procedural_use_count_idx").on(table.use_count),
  ],
)

export type ProceduralMemoryRow = typeof ProceduralMemoryTable.$inferSelect
export type ProceduralMemoryInsert = typeof ProceduralMemoryTable.$inferInsert
