import { Context, Effect, Layer } from "effect"
import { Database } from "../storage"
import { ProceduralMemoryTable } from "./procedural.sql"
import { eq, and, gte, desc, like, sql, inArray } from "drizzle-orm"

export interface SkillPattern {
  skillName: string
  pattern: string
  description: string
  steps?: string[]
  fileTemplate?: string
  tags?: string[]
  scope?: string
  scopeId?: string
  source?: "auto" | "manual" | "learned"
}

export interface SkillQuery {
  skillName?: string
  pattern?: string
  tags?: string[]
  scope?: string
  scopeId?: string
  status?: string
  minUseCount?: number
  limit?: number
}

export interface SkillResult {
  id: number
  createdAt: number
  updatedAt: number
  skillName: string
  pattern: string
  description: string
  steps: string[]
  fileTemplate: string
  tags: string[]
  useCount: number
  successRate: number
  avgDurationMs: number
  lastUsedAt: number
  scope: string
  scopeId: string
  source: string
  confidence: number
  status: string
}

function rowToSkill(row: any): SkillResult {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    skillName: row.skill_name,
    pattern: row.pattern,
    description: row.description,
    steps: row.steps ? JSON.parse(row.steps) : [],
    fileTemplate: row.file_template || "",
    tags: row.tags ? row.tags.split(",").filter(Boolean) : [],
    useCount: row.use_count || 1,
    successRate: row.success_rate || 1.0,
    avgDurationMs: row.avg_duration_ms || 0,
    lastUsedAt: row.last_used_at || 0,
    scope: row.scope || "project",
    scopeId: row.scope_id || "",
    source: row.source || "auto",
    confidence: row.confidence || 0.5,
    status: row.status || "draft",
  }
}

export interface Interface {
  readonly save: (skill: SkillPattern) => Effect.Effect<number>
  readonly query: (q: SkillQuery) => Effect.Effect<SkillResult[]>
  readonly get: (id: number) => Effect.Effect<SkillResult | null>
  readonly findByName: (name: string) => Effect.Effect<SkillResult | null>
  readonly findByPattern: (pattern: string) => Effect.Effect<SkillResult[]>
  readonly recordUse: (id: number, success: boolean, durationMs?: number) => Effect.Effect<void>
  readonly promote: (id: number) => Effect.Effect<void>
  readonly archive: (id: number) => Effect.Effect<void>
  readonly delete: (id: number) => Effect.Effect<void>
  readonly topSkills: (limit?: number) => Effect.Effect<SkillResult[]>
  readonly recentSkills: (limit?: number) => Effect.Effect<SkillResult[]>
  readonly prune: (minUseCount?: number, olderThanDays?: number) => Effect.Effect<number>
}

export class ProceduralMemory extends Context.Service<ProceduralMemory, Interface>()("@opencode/ProceduralMemory") {}

const DAY_MS = 86400000

export const layer = Layer.effect(
  ProceduralMemory,
  Effect.gen(function* () {
    return {
      save: (skill: SkillPattern) =>
        Effect.gen(function* () {
          const now = Date.now()
          const existing = yield* Database.use((db) =>
            db
              .select({ id: ProceduralMemoryTable.id })
              .from(ProceduralMemoryTable)
              .where(
                and(
                  eq(ProceduralMemoryTable.skill_name, skill.skillName),
                  eq(ProceduralMemoryTable.pattern, skill.pattern),
                ),
              )
              .limit(1),
          )

          if (existing.length > 0) {
            yield* Database.use((db) =>
              db
                .update(ProceduralMemoryTable)
                .set({
                  updated_at: now,
                  description: skill.description,
                  steps: JSON.stringify(skill.steps || []),
                  file_template: skill.fileTemplate || "",
                  tags: (skill.tags || []).join(","),
                })
                .where(eq(ProceduralMemoryTable.id, existing[0].id)),
            )
            return existing[0].id
          }

          const result = yield* Database.use((db) =>
            db
              .insert(ProceduralMemoryTable)
              .values({
                created_at: now,
                updated_at: now,
                skill_name: skill.skillName,
                pattern: skill.pattern,
                description: skill.description,
                steps: JSON.stringify(skill.steps || []),
                file_template: skill.fileTemplate || "",
                tags: (skill.tags || []).join(","),
                scope: skill.scope || "project",
                scope_id: skill.scopeId || "",
                source: skill.source || "auto",
              })
              .returning({ id: ProceduralMemoryTable.id }),
          )
          return result[0].id
        }),

      query: (q: SkillQuery) =>
        Effect.gen(function* () {
          const conditions = []
          if (q.skillName) conditions.push(eq(ProceduralMemoryTable.skill_name, q.skillName))
          if (q.pattern) conditions.push(like(ProceduralMemoryTable.pattern, `%${q.pattern}%`))
          if (q.scope) conditions.push(eq(ProceduralMemoryTable.scope, q.scope))
          if (q.scopeId) conditions.push(eq(ProceduralMemoryTable.scope_id, q.scopeId))
          if (q.status) conditions.push(eq(ProceduralMemoryTable.status, q.status))
          if (q.minUseCount) conditions.push(gte(ProceduralMemoryTable.use_count, q.minUseCount))
          if (q.tags && q.tags.length > 0) {
            const tagConds = q.tags.map((t) => like(ProceduralMemoryTable.tags, `%${t}%`))
            conditions.push(and(...tagConds)!)
          }

          const where = conditions.length > 0 ? and(...conditions) : undefined

          const rows = yield* Database.use((db) =>
            db
              .select()
              .from(ProceduralMemoryTable)
              .where(where)
              .orderBy(desc(ProceduralMemoryTable.use_count))
              .limit(q.limit || 50),
          )
          return rows.map(rowToSkill)
        }),

      get: (id: number) =>
        Effect.gen(function* () {
          const rows = yield* Database.use((db) =>
            db.select().from(ProceduralMemoryTable).where(eq(ProceduralMemoryTable.id, id)).limit(1),
          )
          return rows.length > 0 ? rowToSkill(rows[0]) : null
        }),

      findByName: (name: string) =>
        Effect.gen(function* () {
          const rows = yield* Database.use((db) =>
            db
              .select()
              .from(ProceduralMemoryTable)
              .where(eq(ProceduralMemoryTable.skill_name, name))
              .orderBy(desc(ProceduralMemoryTable.use_count))
              .limit(1),
          )
          return rows.length > 0 ? rowToSkill(rows[0]) : null
        }),

      findByPattern: (pattern: string) =>
        Effect.gen(function* () {
          const rows = yield* Database.use((db) =>
            db
              .select()
              .from(ProceduralMemoryTable)
              .where(like(ProceduralMemoryTable.pattern, `%${pattern}%`))
              .orderBy(desc(ProceduralMemoryTable.use_count))
              .limit(20),
          )
          return rows.map(rowToSkill)
        }),

      recordUse: (id: number, success: boolean, durationMs?: number) =>
        Effect.gen(function* () {
          const now = Date.now()
          const existing = yield* Database.use((db) =>
            db
              .select({
                use_count: ProceduralMemoryTable.use_count,
                success_rate: ProceduralMemoryTable.success_rate,
                avg_duration_ms: ProceduralMemoryTable.avg_duration_ms,
              })
              .from(ProceduralMemoryTable)
              .where(eq(ProceduralMemoryTable.id, id))
              .limit(1),
          )
          if (existing.length === 0) return

          const prev = existing[0]
          const newCount = prev.use_count + 1
          const newSuccessRate =
            (prev.success_rate * prev.use_count + (success ? 1 : 0)) / newCount
          const newAvgDuration = durationMs
            ? Math.round((prev.avg_duration_ms * prev.use_count + durationMs) / newCount)
            : prev.avg_duration_ms

          yield* Database.use((db) =>
            db
              .update(ProceduralMemoryTable)
              .set({
                use_count: newCount,
                success_rate: Math.round(newSuccessRate * 100) / 100,
                avg_duration_ms: newAvgDuration,
                last_used_at: now,
                updated_at: now,
                confidence: Math.min(1.0, 0.3 + newCount * 0.05 + (success ? 0.1 : -0.1)),
              })
              .where(eq(ProceduralMemoryTable.id, id)),
          )
        }),

      promote: (id: number) =>
        Effect.gen(function* () {
          yield* Database.use((db) =>
            db
              .update(ProceduralMemoryTable)
              .set({ status: "active", confidence: 0.8, updated_at: Date.now() })
              .where(eq(ProceduralMemoryTable.id, id)),
          )
        }),

      archive: (id: number) =>
        Effect.gen(function* () {
          yield* Database.use((db) =>
            db
              .update(ProceduralMemoryTable)
              .set({ status: "archived", updated_at: Date.now() })
              .where(eq(ProceduralMemoryTable.id, id)),
          )
        }),

      delete: (id: number) =>
        Effect.gen(function* () {
          yield* Database.use((db) =>
            db.delete(ProceduralMemoryTable).where(eq(ProceduralMemoryTable.id, id)),
          )
        }),

      topSkills: (limit = 10) =>
        Effect.gen(function* () {
          const rows = yield* Database.use((db) =>
            db
              .select()
              .from(ProceduralMemoryTable)
              .where(eq(ProceduralMemoryTable.status, "active"))
              .orderBy(desc(ProceduralMemoryTable.use_count))
              .limit(limit),
          )
          return rows.map(rowToSkill)
        }),

      recentSkills: (limit = 10) =>
        Effect.gen(function* () {
          const rows = yield* Database.use((db) =>
            db
              .select()
              .from(ProceduralMemoryTable)
              .orderBy(desc(ProceduralMemoryTable.created_at))
              .limit(limit),
          )
          return rows.map(rowToSkill)
        }),

      prune: (minUseCount = 0, olderThanDays = 90) =>
        Effect.gen(function* () {
          const cutoff = Date.now() - olderThanDays * DAY_MS
          const result = yield* Database.use((db) =>
            db
              .delete(ProceduralMemoryTable)
              .where(
                and(
                  lte(ProceduralMemoryTable.updated_at, cutoff),
                  lte(ProceduralMemoryTable.use_count, minUseCount),
                ),
              ),
          )
          return (result as any).changes || 0
        }),
    }
  }),
)

export const defaultLayer = layer
