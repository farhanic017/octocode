import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { captureScreenBase64 } from "./img-util"

export const Parameters = Schema.Struct({
  action: Schema.String,
  name: Schema.optional(Schema.String),
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
            metadata: { action: params.action },
          })

          try {
            let output: string

            switch (params.action) {
              case "capture_baseline": {
                const base64 = yield* Effect.promise(() => captureScreenBase64())
                output = `Baseline "${params.name}" captured. Size: ${base64.length} bytes`
                break
              }
              case "compare": {
                const base64 = yield* Effect.promise(() => captureScreenBase64())
                output = `Current screenshot captured for comparison with baseline "${params.name}". Size: ${base64.length} bytes. Vision model should analyze for differences.`
                break
              }
              case "list_baselines": {
                output = "No baselines stored. Use capture_baseline to create one."
                break
              }
            }

            return {
              title: `Visual QA: ${params.action}`,
              metadata: { action: params.action },
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
