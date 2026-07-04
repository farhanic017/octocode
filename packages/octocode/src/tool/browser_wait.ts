import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { requireDep } from "./lazy-dep"

export const Parameters = Schema.Struct({
  selector: Schema.optional(Schema.String),
  timeout: Schema.optional(Schema.Number),
  url: Schema.optional(Schema.String),
})

export const BrowserWaitTool = Tool.define(
  "browser_wait",
  Effect.gen(function* () {
    return {
      description: "Wait for an element to appear or a condition to be met in the browser.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_wait",
            patterns: ["browser_wait"],
            always: ["browser_wait"],
            metadata: { selector: params.selector, timeout: params.timeout },
          })

          try {
            const pw = yield* Effect.promise(() => requireDep("playwright"))
            const { chromium } = pw

            const browser = yield* Effect.promise(() => chromium.launch({ headless: false }))
            const page = yield* Effect.promise(() => browser.newPage())

            if (params.url) {
              yield* Effect.promise(() => page.goto(params.url))
            }

            const timeout = params.timeout ?? 30000

            if (params.selector) {
              yield* Effect.promise(() => page.waitForSelector(params.selector, { timeout }))
            } else {
              yield* Effect.promise(() => page.waitForLoadState("networkidle", { timeout }))
            }

            return {
              title: "Wait completed",
              metadata: { selector: params.selector, timeout },
              output: params.selector
                ? `Element ${params.selector} appeared`
                : "Page loaded",
            }
          } catch (error) {
            return {
              title: "Wait failed",
              metadata: { selector: params.selector },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
