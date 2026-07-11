import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"

const Parameters = z.object({
  operation: z.enum(["save", "search", "use", "promote", "list", "stats"]),
  skill_name: z.string().optional().describe("Name of the learned skill/procedure"),
  pattern: z.string().optional().describe("Pattern description (what triggers this skill)"),
  description: z.string().optional().describe("What this skill does, step by step"),
  steps: z.string().optional().describe("JSON array of step strings"),
  tags: z.string().optional().describe("Comma-separated tags"),
  skill_id: z.number().optional().describe("Skill ID for use/promote operations"),
  success: z.boolean().optional().describe("Whether the skill use was successful"),
  duration_ms: z.number().optional().describe("Duration in milliseconds"),
  limit: z.number().optional().describe("Max results (default 10)"),
})

export const ProceduralMemoryTool = Tool.define(
  "procedural-memory",
  Effect.gen(function* () {
    const { ProceduralMemory } = yield* Effect.promise(() => import("../memory/procedural"))
    const memory = yield* ProceduralMemory

    return {
      description: `Procedural memory stores learned skills and procedures the agent discovers over time.
- save: Record a new or updated skill with pattern + steps
- search: Find skills by name, pattern, or tags
- use: Record that a skill was used (tracks success rate and usage count)
- promote: Promote a draft skill to active status
- list: List top or recent skills
- stats: Show skill library statistics`,

      parameters: Parameters,

      execute: (params: z.infer<typeof Parameters>) =>
        Effect.gen(function* () {
          switch (params.operation) {
            case "save": {
              if (!params.skill_name || !params.pattern || !params.description) {
                return { output: "Error: skill_name, pattern, and description are required", title: "Procedural Memory", metadata: {} }
              }
              const steps = params.steps ? JSON.parse(params.steps) : []
              const id = yield* memory.save({
                skillName: params.skill_name,
                pattern: params.pattern,
                description: params.description,
                steps,
                tags: params.tags ? params.tags.split(",").map((t) => t.trim()) : [],
              })
              return {
                output: `Saved skill "${params.skill_name}" (id: ${id})\nPattern: ${params.pattern}\nDescription: ${params.description}`,
                title: "Procedural Memory",
                metadata: { id },
              }
            }

            case "search": {
              const results = yield* memory.query({
                skillName: params.skill_name,
                pattern: params.pattern,
                tags: params.tags ? params.tags.split(",").map((t) => t.trim()) : undefined,
                limit: params.limit || 10,
              })
              if (results.length === 0) {
                return { output: "No skills found matching your query.", title: "Procedural Memory", metadata: {} }
              }
              const output = results
                .map(
                  (r) =>
                    `#${r.id} [${r.status}] ${r.skillName} (used ${r.useCount}x, ${Math.round(r.successRate * 100)}% success)\n  Pattern: ${r.pattern}\n  ${r.description}\n  Steps: ${r.steps.length} | Tags: ${r.tags.join(", ")}`,
                )
                .join("\n\n")
              return { output, title: `Skills Found (${results.length})`, metadata: {} }
            }

            case "use": {
              if (!params.skill_id) {
                return { output: "Error: skill_id is required for use operation", title: "Procedural Memory", metadata: {} }
              }
              yield* memory.recordUse(params.skill_id, params.success ?? true, params.duration_ms)
              const skill = yield* memory.get(params.skill_id)
              return {
                output: skill
                  ? `Recorded use of "${skill.skillName}" — total uses: ${skill.useCount}, success rate: ${Math.round(skill.successRate * 100)}%`
                  : `Skill #${params.skill_id} not found`,
                title: "Procedural Memory",
                metadata: {},
              }
            }

            case "promote": {
              if (!params.skill_id) {
                return { output: "Error: skill_id is required for promote operation", title: "Procedural Memory", metadata: {} }
              }
              yield* memory.promote(params.skill_id)
              const skill = yield* memory.get(params.skill_id)
              return {
                output: skill ? `Promoted "${skill.skillName}" to active status` : `Skill #${params.skill_id} not found`,
                title: "Procedural Memory",
                metadata: {},
              }
            }

            case "list": {
              const top = yield* memory.topSkills(params.limit || 10)
              if (top.length === 0) {
                return { output: "No active skills learned yet.", title: "Procedural Memory", metadata: {} }
              }
              const output = top
                .map(
                  (r) =>
                    `📋 ${r.skillName} — used ${r.useCount}x (${Math.round(r.successRate * 100)}% success)\n   ${r.description}`,
                )
                .join("\n\n")
              return { output, title: `Top Skills (${top.length})`, metadata: {} }
            }

            case "stats": {
              const all = yield* memory.query({ limit: 1000 })
              const active = all.filter((s) => s.status === "active").length
              const draft = all.filter((s) => s.status === "draft").length
              const archived = all.filter((s) => s.status === "archived").length
              const totalUses = all.reduce((sum, s) => sum + s.useCount, 0)
              const avgSuccess = all.length > 0 ? all.reduce((sum, s) => sum + s.successRate, 0) / all.length : 0
              return {
                output: `Procedural Memory Stats:\n  Total skills: ${all.length}\n  Active: ${active} | Draft: ${draft} | Archived: ${archived}\n  Total uses: ${totalUses}\n  Avg success rate: ${Math.round(avgSuccess * 100)}%`,
                title: "Procedural Memory Stats",
                metadata: { total: all.length, active, draft, archived, totalUses },
              }
            }

            default:
              return { output: "Unknown operation", title: "Procedural Memory", metadata: {} }
          }
        }).pipe(Effect.orDie),
    }
  }) as any,
)
