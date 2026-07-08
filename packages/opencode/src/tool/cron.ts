import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"

const Parameters = z.object({
  operation: z.enum(["create", "list", "enable", "disable", "delete", "due"]),
  name: z.string().optional().describe("Schedule name"),
  cron_expr: z.string().optional().describe("Cron expression (min hour day month weekday)"),
  command: z.string().optional().describe("Command/task to run"),
  args: z.string().optional().describe("JSON args for the command"),
  schedule_id: z.number().optional().describe("Schedule ID for enable/disable/delete"),
  session_id: z.string().optional().describe("Session ID"),
})

export const CronTool = Tool.define(
  "cron",
  Effect.gen(function* () {
    const mod = yield* Effect.promise(() => import("../memory/cron"))
    return {
      description: `Task scheduler with cron expressions for recurring tasks.
- create: Schedule a recurring task
- list: Show all schedules
- enable/disable: Toggle a schedule
- delete: Remove a schedule
- due: Show tasks due now

Cron: min hour day month weekday
  "0 9 * * *" = daily 9am
  "0 9 * * 1" = Mondays 9am
  "*/15 * * * *" = every 15 min`,

      parameters: Parameters,

      execute: (params: z.infer<typeof Parameters>) =>
        Effect.gen(function* () {
          switch (params.operation) {
            case "create": {
              if (!params.name || !params.cron_expr || !params.command) {
                return { output: "Error: name, cron_expr, command required", title: "Cron", metadata: {} }
              }
              if (!mod.parseCron(params.cron_expr)) return { output: `Invalid cron: ${params.cron_expr}`, title: "Cron", metadata: {} }
              const args = params.args ? JSON.parse(params.args) : {}
              const nextRun = mod.getNextRunTime(params.cron_expr)
              const id = yield* Effect.promise(() =>
                mod.createSchedule(params.name, params.cron_expr, params.command, args, params.session_id || ""),
              )
              return {
                output: `Schedule #${id} "${params.name}"\n  Cron: ${params.cron_expr}\n  Command: ${params.command}\n  Next: ${nextRun.toLocaleString()}`,
                title: "Schedule Created",
                metadata: { id },
              }
            }

            case "list": {
              const schedules = yield* Effect.promise(() => mod.listSchedules())
              if (schedules.length === 0) return { output: "No schedules.", title: "Cron", metadata: {} }
              const output = schedules
                .map((s) => `  #${s.id} ${s.enabled ? "●" : "○"} "${s.name}" — ${s.cronExpr} → ${s.command} (${s.runCount} runs)`)
                .join("\n")
              return { output: `Schedules:\n${output}`, title: `Schedules (${schedules.length})`, metadata: {} }
            }

            case "enable": {
              if (!params.schedule_id) return { output: "Error: schedule_id required", title: "Cron", metadata: {} }
              yield* Effect.promise(() => mod.enableSchedule(params.schedule_id))
              return { output: `Schedule #${params.schedule_id} enabled`, title: "Cron", metadata: {} }
            }

            case "disable": {
              if (!params.schedule_id) return { output: "Error: schedule_id required", title: "Cron", metadata: {} }
              yield* Effect.promise(() => mod.disableSchedule(params.schedule_id))
              return { output: `Schedule #${params.schedule_id} disabled`, title: "Cron", metadata: {} }
            }

            case "delete": {
              if (!params.schedule_id) return { output: "Error: schedule_id required", title: "Cron", metadata: {} }
              yield* Effect.promise(() => mod.deleteSchedule(params.schedule_id))
              return { output: `Schedule #${params.schedule_id} deleted`, title: "Cron", metadata: {} }
            }

            case "due": {
              const due = yield* Effect.promise(() => mod.getDueSchedules())
              if (due.length === 0) return { output: "No tasks due now.", title: "Cron", metadata: {} }
              const output = due.map((s) => `  #${s.id} "${s.name}" → ${s.command}`).join("\n")
              return { output: `Due:\n${output}`, title: `Due (${due.length})`, metadata: {} }
            }

            default:
              return { output: "Unknown operation", title: "Cron", metadata: {} }
          }
        }).pipe(Effect.orDie),
    }
  }),
)
