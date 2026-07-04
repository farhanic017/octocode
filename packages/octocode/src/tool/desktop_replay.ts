import { Effect, Schema } from "effect"
import * as Tool from "./tool"

const ReplayActionSchema = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("save"),
    name: Schema.String,
    steps: Schema.Array(
      Schema.Struct({
        type: Schema.String,
        description: Schema.String,
      }),
    ),
  }),
  Schema.Struct({
    action: Schema.Literal("load"),
    name: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("list"),
  }),
  Schema.Struct({
    action: Schema.Literal("delete"),
    name: Schema.String,
  }),
])

export const Parameters = Schema.Struct({
  replay: ReplayActionSchema,
})

const savedWorkflows = new Map<string, Array<{ type: string; description: string }>>()

export const DesktopReplayTool = Tool.define(
  "desktop_replay",
  Effect.gen(function* () {
    return {
      description:
        "Save, load, list, or delete recorded workflows for replay. Workflows contain step descriptions that can be re-executed.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "desktop_replay",
            patterns: ["desktop_replay"],
            always: ["desktop_replay"],
            metadata: { replay: params.replay },
          })

          try {
            let output: string

            switch (params.replay.action) {
              case "save": {
                savedWorkflows.set(params.replay.name, params.replay.steps)
                output = `Workflow "${params.replay.name}" saved with ${params.replay.steps.length} steps.`
                break
              }
              case "load": {
                const steps = savedWorkflows.get(params.replay.name)
                if (steps) {
                  output = `Workflow "${params.replay.name}" loaded:\n${steps.map((s, i) => `${i + 1}. [${s.type}] ${s.description}`).join("\n")}`
                } else {
                  output = `Workflow "${params.replay.name}" not found.`
                }
                break
              }
              case "list": {
                const names = Array.from(savedWorkflows.keys())
                output = names.length > 0 ? `Saved workflows:\n${names.join("\n")}` : "No saved workflows."
                break
              }
              case "delete": {
                if (savedWorkflows.has(params.replay.name)) {
                  savedWorkflows.delete(params.replay.name)
                  output = `Workflow "${params.replay.name}" deleted.`
                } else {
                  output = `Workflow "${params.replay.name}" not found.`
                }
                break
              }
            }

            return {
              title: `Replay: ${params.replay.action}`,
              metadata: { action: params.replay.action },
              output,
            }
          } catch (error) {
            return {
              title: "Replay error",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
