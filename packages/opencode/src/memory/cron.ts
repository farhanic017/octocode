import { Database } from "../storage"
import { eq, and, gte, lte, sql } from "drizzle-orm"
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

export const CronScheduleTable = sqliteTable(
  "cron_schedule",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    created_at: integer().notNull(),
    updated_at: integer().notNull(),
    name: text().notNull(),
    cron_expr: text().notNull(),
    command: text().notNull(),
    args: text().notNull().default("{}"),
    enabled: integer().notNull().default(1),
    last_run_at: integer().notNull().default(0),
    next_run_at: integer().notNull().default(0),
    last_result: text().notNull().default(""),
    run_count: integer().notNull().default(0),
    session_id: text().notNull().default(""),
  },
  (table) => [
    index("cron_next_run_idx").on(table.next_run_at),
    index("cron_enabled_idx").on(table.enabled),
  ],
)

type CronField = number | "*" | string

interface ParsedCron {
  minute: CronField
  hour: CronField
  dayOfMonth: CronField
  month: CronField
  dayOfWeek: CronField
}

export function parseCron(expr: string): ParsedCron | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  }
}

function matchField(field: CronField, value: number, max: number): boolean {
  if (field === "*") return true
  if (typeof field === "string" && field.includes(",")) {
    return field.split(",").some((v) => matchField(v.trim(), value, max))
  }
  if (typeof field === "string" && field.includes("-")) {
    const [start, end] = field.split("-").map(Number)
    return value >= start && value <= end
  }
  if (typeof field === "string" && field.includes("/")) {
    const [_, step] = field.split("/")
    return value % Number(step) === 0
  }
  return Number(field) === value
}

export function shouldRunNow(cronExpr: string, lastRunAt: number): boolean {
  const parsed = parseCron(cronExpr)
  if (!parsed) return false

  const now = new Date()
  const lastRun = new Date(lastRunAt)

  if (now.getFullYear() !== lastRun.getFullYear() ||
      now.getMonth() !== lastRun.getMonth() ||
      now.getDate() !== lastRun.getDate()) {
    return matchField(parsed.minute, now.getMinutes(), 59) &&
           matchField(parsed.hour, now.getHours(), 23)
  }

  const minDiff = now.getMinutes() - lastRun.getMinutes()
  if (minDiff <= 0) return false

  return matchField(parsed.minute, now.getMinutes(), 59) &&
         matchField(parsed.hour, now.getHours(), 23) &&
         matchField(parsed.dayOfMonth, now.getDate(), 31) &&
         matchField(parsed.month, now.getMonth() + 1, 12) &&
         matchField(parsed.dayOfWeek, now.getDay(), 6)
}

export function getNextRunTime(cronExpr: string, from: Date = new Date()): Date {
  const parsed = parseCron(cronExpr)
  if (!parsed) return new Date(from.getTime() + 3600000)

  const next = new Date(from)
  next.setSeconds(0)
  next.setMilliseconds(0)

  if (parsed.minute !== "*") next.setMinutes(Number(parsed.minute))
  else next.setMinutes(next.getMinutes() + 1)

  if (parsed.hour !== "*") next.setHours(Number(parsed.hour))
  else if (next <= from) next.setHours(next.getHours() + 1)

  if (next <= from) next.setHours(next.getHours() + 1)

  return next
}

export interface CronEntry {
  id: number
  createdAt: number
  updatedAt: number
  name: string
  cronExpr: string
  command: string
  args: Record<string, unknown>
  enabled: boolean
  lastRunAt: number
  nextRunAt: number
  lastResult: string
  runCount: number
  sessionId: string
}

function rowToEntry(row: any): CronEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    cronExpr: row.cron_expr,
    command: row.command,
    args: row.args ? JSON.parse(row.args) : {},
    enabled: row.enabled === 1,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    lastResult: row.last_result || "",
    runCount: row.run_count || 0,
    sessionId: row.session_id || "",
  }
}

export async function createSchedule(
  name: string,
  cronExpr: string,
  command: string,
  args: Record<string, unknown> = {},
  sessionId: string = "",
): Promise<number> {
  if (!parseCron(cronExpr)) throw new Error(`Invalid cron expression: ${cronExpr}`)
  const now = Date.now()
  const nextRun = getNextRunTime(cronExpr).getTime()

  const result = await Database.use((db) =>
    db
      .insert(CronScheduleTable)
      .values({
        created_at: now,
        updated_at: now,
        name,
        cron_expr: cronExpr,
        command,
        args: JSON.stringify(args),
        next_run_at: nextRun,
        session_id: sessionId,
      })
      .returning({ id: CronScheduleTable.id }),
  )
  return result[0].id
}

export async function listSchedules(enabledOnly = true): Promise<CronEntry[]> {
  const where = enabledOnly ? eq(CronScheduleTable.enabled, 1) : undefined
  const rows = await Database.use((db) =>
    db.select().from(CronScheduleTable).where(where).orderBy(CronScheduleTable.next_run_at),
  )
  return rows.map(rowToEntry)
}

export async function getDueSchedules(): Promise<CronEntry[]> {
  const now = Date.now()
  const rows = await Database.use((db) =>
    db
      .select()
      .from(CronScheduleTable)
      .where(
        and(
          eq(CronScheduleTable.enabled, 1),
          lte(CronScheduleTable.next_run_at, now),
        ),
      )
      .orderBy(CronScheduleTable.next_run_at),
  )
  return rows.map(rowToEntry)
}

export async function markRun(id: number, result: string, success: boolean): Promise<void> {
  const now = Date.now()
  const entry = await Database.use((db) =>
    db.select().from(CronScheduleTable).where(eq(CronScheduleTable.id, id)).limit(1),
  )
  if (entry.length === 0) return

  const nextRun = getNextRunTime(entry[0].cron_expr, new Date(now)).getTime()

  await Database.use((db) =>
    db
      .update(CronScheduleTable)
      .set({
        last_run_at: now,
        next_run_at: nextRun,
        last_result: result,
        run_count: entry[0].run_count + 1,
        updated_at: now,
      })
      .where(eq(CronScheduleTable.id, id)),
  )
}

export async function enableSchedule(id: number): Promise<void> {
  await Database.use((db) =>
    db.update(CronScheduleTable).set({ enabled: 1, updated_at: Date.now() }).where(eq(CronScheduleTable.id, id)),
  )
}

export async function disableSchedule(id: number): Promise<void> {
  await Database.use((db) =>
    db.update(CronScheduleTable).set({ enabled: 0, updated_at: Date.now() }).where(eq(CronScheduleTable.id, id)),
  )
}

export async function deleteSchedule(id: number): Promise<void> {
  await Database.use((db) =>
    db.delete(CronScheduleTable).where(eq(CronScheduleTable.id, id)),
  )
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null
let onDue: ((entry: CronEntry) => Promise<void>) | null = null

export function startScheduler(callback: (entry: CronEntry) => Promise<void>) {
  onDue = callback
  if (schedulerTimer) return

  schedulerTimer = setInterval(async () => {
    if (!onDue) return
    try {
      const due = await getDueSchedules()
      for (const entry of due) {
        try {
          await onDue(entry)
          await markRun(entry.id, "success", true)
        } catch (e: any) {
          await markRun(entry.id, `error: ${e.message}`, false)
        }
      }
    } catch {}
  }, 30000)
}

export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
  onDue = null
}
