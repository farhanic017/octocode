import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { requireDep } from "./lazy-dep"

export const Parameters = Schema.Struct({
  script: Schema.String,
  url: Schema.optional(Schema.String),
})

export const BrowserEvaluateTool = Tool.define(
  "browser_evaluate",
  Effect.gen(function* () {
    return {
      description: "Execute JavaScript in the browser and return the result.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_evaluate",
            patterns: ["browser_evaluate"],
            always: ["browser_evaluate"],
            metadata: { script: params.script },
          })

          try {
            const pw = yield* Effect.promise(() => requireDep("playwright"))
            const { chromium } = pw

            const browser = yield* Effect.promise(() => chromium.launch({ headless: false }))
            const page = yield* Effect.promise(() => browser.newPage())

            if (params.url) {
              yield* Effect.promise(() => page.goto(params.url))
            }

            const result = yield* Effect.promise(() => page.evaluate(params.script))

            return {
              title: "Script executed",
              metadata: { script: params.script },
              output: `Result: ${JSON.stringify(result)}`,
            }
          } catch (error) {
            return {
              title: "Script execution failed",
              metadata: { script: params.script },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
