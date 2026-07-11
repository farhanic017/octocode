import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"

const Parameters = z.object({
  operation: z.enum(["record", "query", "recent", "failures", "stats"]),
  task_type: z.string().optional().describe("Task type: bugfix, feature, refactor, test, build, deploy, research, etc."),
  outcome: z.enum(["success", "failure", "partial", "skipped"]).optional().describe("Task outcome"),
  title: z.string().optional().describe("Short title for the episodic event"),
  summary: z.string().optional().describe("What happened"),
  tags: z.string().optional().describe("Comma-separated tags"),
  session_id: z.string().optional().describe("Session ID to query"),
  since_hours: z.number().optional().describe("Query events from last N hours"),
  limit: z.number().optional().describe("Max results (default 10)"),
})

export const EpisodicMemoryTool = Tool.define(
  "episodic-memory",
  Effect.gen(function* () {
    const { EpisodicMemory } = yield* Effect.promise(() => import("../memory/episodic"))
    const memory = yield* EpisodicMemory

    return {
      description: `Episodic memory stores timestamped records of past tasks, failures, and successes.
- record: Log a completed task with outcome (success/failure/partial)
- query: Search episodic records by task type, outcome, or time range
- recent: Get recent episodic records
- failures: Get recent failures to learn from past mistakes
- stats: Count total records and success/failure rates`,

      parameters: Parameters,

      execute: (params: z.infer<typeof Parameters>) =>
        Effect.gen(function* () {
          const now = Date.now()

          switch (params.operation) {
            case "record": {
              if (!params.title || !params.outcome) {
                return { output: "Error: title and outcome are required for record", title: "Episodic Memory", metadata: {} }
              }
              const id = yield* memory.record({
                timestamp: now,
                sessionId: params.session_id || "",
                taskType: params.task_type || "unknown",
                outcome: params.outcome,
                title: params.title,
                summary: params.summary || params.title,
                tags: params.tags ? params.tags.split(",").map((t) => t.trim()) : [],
              })
              return {
                output: `Recorded episodic event #${id}: [${params.outcome}] ${params.title}`,
                title: "Episodic Memory",
                metadata: { id },
              }
            }

            case "query": {
              const results = yield* memory.query({
                taskType: params.task_type,
                outcome: params.outcome,
                sessionId: params.session_id,
                since: params.since_hours ? now - params.since_hours * 3600000 : undefined,
                tags: params.tags,
                limit: params.limit || 10,
              })
              if (results.length === 0) {
                return { output: "No episodic records found matching your query.", title: "Episodic Memory", metadata: {} }
              }
              const output = results
                .map(
                  (r) =>
                    `#${r.id} [${r.outcome}] ${r.taskType}: ${r.title}\n  ${r.summary}\n  ${new Date(r.timestamp).toLocaleString()} | ${r.durationMs}ms | tags: ${r.tags.join(", ")}`,
                )
                .join("\n\n")
              return { output, title: `Episodic Memory (${results.length} results)`, metadata: {} }
            }

            case "recent": {
              const results = yield* memory.query({
                since: params.since_hours ? now - params.since_hours * 3600000 : now - 86400000,
                limit: params.limit || 10,
              })
              if (results.length === 0) {
                return { output: "No recent episodic records.", title: "Episodic Memory", metadata: {} }
              }
              const output = results
                .map(
                  (r) =>
                    `[${r.outcome}] ${r.title} — ${new Date(r.timestamp).toLocaleString()}`,
                )
                .join("\n")
              return { output, title: `Recent Episodes (${results.length})`, metadata: {} }
            }

            case "failures": {
              const results = yield* memory.recentFailures(params.task_type, params.limit || 10)
              if (results.length === 0) {
                return { output: "No recent failures recorded.", title: "Episodic Memory", metadata: {} }
              }
              const output = results
                .map(
                  (r) =>
                    `❌ ${r.title}\n   ${r.summary}\n   Error: ${r.errorMessage || "none"}\n   ${new Date(r.timestamp).toLocaleString()}`,
                )
                .join("\n\n")
              return { output, title: `Recent Failures (${results.length})`, metadata: {} }
            }

            case "stats": {
              const total = yield* memory.count()
              const successes = yield* memory.count("success")
              const failures = yield* memory.count("failure")
              const partials = yield* memory.count("partial")
              const rate = total > 0 ? Math.round((successes / total) * 100) : 0
              return {
                output: `Episodic Memory Stats:\n  Total: ${total}\n  Success: ${successes} (${rate}%)\n  Failure: ${failures}\n  Partial: ${partials}`,
                title: "Episodic Memory Stats",
                metadata: { total, successes, failures, partials, successRate: rate },
              }
            }

            default:
              return { output: "Unknown operation", title: "Episodic Memory", metadata: {} }
          }
        }).pipe(Effect.orDie),
    }
  }) as any,
)
