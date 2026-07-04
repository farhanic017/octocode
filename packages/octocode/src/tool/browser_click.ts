import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { requireDep } from "./lazy-dep"

export const Parameters = Schema.Struct({
  selector: Schema.String,
  url: Schema.optional(Schema.String),
})

export const BrowserClickTool = Tool.define(
  "browser_click",
  Effect.gen(function* () {
    return {
      description: "Click an element in the browser by CSS selector.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_click",
            patterns: [params.selector],
            always: [`browser_click:${params.selector}`],
            metadata: { selector: params.selector },
          })

          try {
            const pw = yield* Effect.promise(() => requireDep("playwright"))
            const { chromium } = pw

            const browser = yield* Effect.promise(() => chromium.launch({ headless: false }))
            const page = yield* Effect.promise(() => browser.newPage())

            if (params.url) {
              yield* Effect.promise(() => page.goto(params.url))
            }

            yield* Effect.promise(() => page.click(params.selector))

            return {
              title: `Clicked ${params.selector}`,
              metadata: { selector: params.selector },
              output: `Clicked element: ${params.selector}`,
            }
          } catch (error) {
            return {
              title: `Failed to click ${params.selector}`,
              metadata: { selector: params.selector },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
