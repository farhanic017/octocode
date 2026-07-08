import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"

const Parameters = z.object({
  operation: z.enum(["reflect", "suggest", "stats"]),
  session_id: z.string().optional().describe("Current session ID"),
  task_type: z.string().optional().describe("Task type for reflection/suggestion"),
  title: z.string().optional().describe("Task title"),
  summary: z.string().optional().describe("What was accomplished"),
  outcome: z.enum(["success", "failure"]).optional().describe("Task outcome"),
  files_changed: z.string().optional().describe("Comma-separated list of files changed"),
  duration_ms: z.number().optional().describe("How long the task took in ms"),
  tags: z.string().optional().describe("Comma-separated tags"),
  error_message: z.string().optional().describe("Error message if failed"),
})

export const LearningLoopTool = Tool.define(
  "learning-loop",
  Effect.gen(function* () {
    const mod = yield* Effect.promise(() => import("../memory/learning-loop"))
    return {
      description: `Self-improving learning loop. Reflects on completed tasks and crystallizes complex successful workflows into reusable Skills.
- reflect: Record a completed task. Complex successes auto-crystallize into Skills.
- suggest: Get suggestions for similar tasks based on learned patterns.
- stats: Show learning statistics (episodes, skills, active).`,

      parameters: Parameters,

      execute: (params: z.infer<typeof Parameters>) =>
        Effect.gen(function* () {
          switch (params.operation) {
            case "reflect": {
              if (!params.title || !params.outcome || !params.task_type) {
                return { output: "Error: title, outcome, and task_type required", title: "Learning Loop", metadata: {} }
              }
              const result = yield* Effect.promise(() =>
                mod.reflectOnTask({
                  sessionId: params.session_id || "",
                  taskType: params.task_type,
                  title: params.title,
                  summary: params.summary || params.title,
                  filesChanged: params.files_changed ? params.files_changed.split(",").map((f) => f.trim()) : [],
                  durationMs: params.duration_ms || 0,
                  outcome: params.outcome,
                  errorMessage: params.error_message,
                  tags: params.tags ? params.tags.split(",").map((t) => t.trim()) : [],
                }),
              )
              let output = `Recorded episode #${result.episodeId} [${params.outcome}] (complexity: ${result.complexity})`
              if (result.crystallized) {
                output += `\nCrystallized Skill: "${result.crystallized.skillName}"\nPattern: ${result.crystallized.pattern}\nConfidence: ${Math.round(result.crystallized.confidence * 100)}%`
              } else if (result.complexity < 3) {
                output += "\n(Complexity too low to crystallize)"
              }
              return { output, title: "Learning Loop", metadata: { episodeId: result.episodeId, complexity: result.complexity, crystallized: !!result.crystallized } }
            }

            case "suggest": {
              if (!params.task_type) return { output: "Error: task_type required", title: "Learning Loop", metadata: {} }
              const suggestions = yield* Effect.promise(() => mod.getSuggestions(params.task_type))
              if (suggestions.length === 0) return { output: `No learned skills for "${params.task_type}"`, title: "Learning Loop", metadata: {} }
              return { output: `Skills for "${params.task_type}":\n${suggestions.join("\n")}`, title: "Learning Loop", metadata: {} }
            }

            case "stats": {
              const stats = yield* Effect.promise(() => mod.getStats())
              return {
                output: `Episodes: ${stats.totalEpisodes} | Skills: ${stats.totalSkills} | Active: ${stats.activeSkills} | Learned: ${stats.learnedSkills}`,
                title: "Learning Loop Stats",
                metadata: stats,
              }
            }

            default:
              return { output: "Unknown operation", title: "Learning Loop", metadata: {} }
          }
        }).pipe(Effect.orDie),
    }
  }),
)
