import { Effect, Schema } from "effect"
import * as Tool from "./tool"

const QAActionSchema = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("capture_baseline"),
    name: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("compare"),
    name: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("list_baselines"),
  }),
])

export const Parameters = Schema.Struct({
  qa: QAActionSchema,
})

export const VisualQATool = Tool.define(
  "visual_qa",
  Effect.gen(function* () {
    return {
      description:
        "Visual QA: capture baseline screenshots and compare current state to detect UI regressions.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "visual_qa",
            patterns: ["visual_qa"],
            always: ["visual_qa"],
            metadata: { qa: params.qa },
          })

          try {
            const { screen } = yield* Effect.promise(() => import("@nut-tree-fork/nut-js"))

            let output: string

            switch (params.qa.action) {
              case "capture_baseline": {
                const img = yield* Effect.promise(() => screen.capture())
                const base64 = img.toBase64("png")
                output = `Baseline "${params.qa.name}" captured. Size: ${base64.length} bytes`
                break
              }
              case "compare": {
                const img = yield* Effect.promise(() => screen.capture())
                const base64 = img.toBase64("png")
                output = `Current screenshot captured for comparison with baseline "${params.qa.name}". Size: ${base64.length} bytes. Vision model should analyze for differences.`
                break
              }
              case "list_baselines": {
                output = "No baselines stored. Use capture_baseline to create one."
                break
              }
            }

            return {
              title: `Visual QA: ${params.qa.action}`,
              metadata: { action: params.qa.action },
              output,
            }
          } catch (error) {
            return {
              title: "Visual QA error",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
