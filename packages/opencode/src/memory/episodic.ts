import { Context, Effect, Layer } from "effect"
import { Database } from "../storage"
import { EpisodicMemoryTable } from "./episodic.sql"
import { eq, and, gte, lte, desc, like, sql } from "drizzle-orm"

export interface EpisodicEvent {
  timestamp: number
  sessionId: string
  taskType: string
  outcome: "success" | "failure" | "partial" | "skipped"
  title: string
  summary: string
  details?: string
  tags?: string[]
  durationMs?: number
  filesChanged?: string[]
  errorMessage?: string
  retryCount?: number
}

export interface EpisodicQuery {
  taskType?: string
  outcome?: string
  sessionId?: string
  since?: number
  until?: number
  tags?: string
  limit?: number
}

export interface EpisodicResult {
  id: number
  timestamp: number
  sessionId: string
  taskType: string
  outcome: string
  title: string
  summary: string
  details: string
  tags: string[]
  durationMs: number
  filesChanged: string[]
  errorMessage: string
  retryCount: number
  confidence: number
}

function recordToEvent(row: any): EpisodicResult {
  return {
    id: row.id,
    timestamp: row.timestamp,
    sessionId: row.session_id,
    taskType: row.task_type,
    outcome: row.outcome,
    title: row.title,
    summary: row.summary,
    details: row.details || "",
    tags: row.tags ? row.tags.split(",").filter(Boolean) : [],
    durationMs: row.duration_ms || 0,
    filesChanged: row.files_changed ? row.files_changed.split(",").filter(Boolean) : [],
    errorMessage: row.error_message || "",
    retryCount: row.retry_count || 0,
    confidence: row.confidence || 1.0,
  }
}

export interface Interface {
  readonly record: (event: EpisodicEvent) => Effect.Effect<number>
  readonly query: (q: EpisodicQuery) => Effect.Effect<EpisodicResult[]>
  readonly get: (id: number) => Effect.Effect<EpisodicResult | null>
  readonly count: (outcome?: string) => Effect.Effect<number>
  readonly recentFailures: (taskType?: string, limit?: number) => Effect.Effect<EpisodicResult[]>
  readonly successes: (taskType?: string, limit?: number) => Effect.Effect<EpisodicResult[]>
  readonly delete: (id: number) => Effect.Effect<void>
  readonly prune: (olderThanMs: number) => Effect.Effect<number>
}

export class EpisodicMemory extends Context.Service<EpisodicMemory, Interface>()("@opencode/EpisodicMemory") {}

const DAY_MS = 86400000

export const layer = Layer.effect(
  EpisodicMemory,
  Effect.gen(function* () {
    return {
      record: (event: EpisodicEvent) =>
        Effect.gen(function* () {
          const result = yield* Database.use((db) =>
            db
              .insert(EpisodicMemoryTable)
              .values({
                timestamp: event.timestamp || Date.now(),
                session_id: event.sessionId,
                task_type: event.taskType,
                outcome: event.outcome,
                title: event.title,
                summary: event.summary,
                details: event.details || "",
                tags: (event.tags || []).join(","),
                duration_ms: event.durationMs || 0,
                files_changed: (event.filesChanged || []).join(","),
                error_message: event.errorMessage || "",
                retry_count: event.retryCount || 0,
              })
              .returning({ id: EpisodicMemoryTable.id }),
          )
          return result[0].id
        }),

      query: (q: EpisodicQuery) =>
        Effect.gen(function* () {
          const conditions = []
          if (q.taskType) conditions.push(eq(EpisodicMemoryTable.task_type, q.taskType))
          if (q.outcome) conditions.push(eq(EpisodicMemoryTable.outcome, q.outcome))
          if (q.sessionId) conditions.push(eq(EpisodicMemoryTable.session_id, q.sessionId))
          if (q.since) conditions.push(gte(EpisodicMemoryTable.timestamp, q.since))
          if (q.until) conditions.push(lte(EpisodicMemoryTable.timestamp, q.until))
          if (q.tags) conditions.push(like(EpisodicMemoryTable.tags, `%${q.tags}%`))

          const where = conditions.length > 0 ? and(...conditions) : undefined

          const rows = yield* Database.use((db) =>
            db
              .select()
              .from(EpisodicMemoryTable)
              .where(where)
              .orderBy(desc(EpisodicMemoryTable.timestamp))
              .limit(q.limit || 50),
          )

          return rows.map(recordToEvent)
        }),

      get: (id: number) =>
        Effect.gen(function* () {
          const rows = yield* Database.use((db) =>
            db.select().from(EpisodicMemoryTable).where(eq(EpisodicMemoryTable.id, id)).limit(1),
          )
          return rows.length > 0 ? recordToEvent(rows[0]) : null
        }),

      count: (outcome?: string) =>
        Effect.gen(function* () {
          const where = outcome ? eq(EpisodicMemoryTable.outcome, outcome) : undefined
          const rows = yield* Database.use((db) =>
            db
              .select({ count: sql<number>`count(*)` })
              .from(EpisodicMemoryTable)
              .where(where),
          )
          return rows[0].count
        }),

      recentFailures: (taskType?: string, limit = 10) =>
        Effect.gen(function* () {
          const conditions = [eq(EpisodicMemoryTable.outcome, "failure")]
          if (taskType) conditions.push(eq(EpisodicMemoryTable.task_type, taskType))

          const rows = yield* Database.use((db) =>
            db
              .select()
              .from(EpisodicMemoryTable)
              .where(and(...conditions))
              .orderBy(desc(EpisodicMemoryTable.timestamp))
              .limit(limit),
          )
          return rows.map(recordToEvent)
        }),

      successes: (taskType?: string, limit = 10) =>
        Effect.gen(function* () {
          const conditions = [eq(EpisodicMemoryTable.outcome, "success")]
          if (taskType) conditions.push(eq(EpisodicMemoryTable.task_type, taskType))

          const rows = yield* Database.use((db) =>
            db
              .select()
              .from(EpisodicMemoryTable)
              .where(and(...conditions))
              .orderBy(desc(EpisodicMemoryTable.timestamp))
              .limit(limit),
          )
          return rows.map(recordToEvent)
        }),

      delete: (id: number) =>
        Effect.gen(function* () {
          yield* Database.use((db) =>
            db.delete(EpisodicMemoryTable).where(eq(EpisodicMemoryTable.id, id)),
          )
        }),

      prune: (olderThanMs: number) =>
        Effect.gen(function* () {
          const cutoff = Date.now() - olderThanMs
          const result = yield* Database.use((db) =>
            db
              .delete(EpisodicMemoryTable)
              .where(lte(EpisodicMemoryTable.timestamp, cutoff)),
          )
          return (result as any).changes || 0
        }),
    }
  }),
)

export const defaultLayer = layer
