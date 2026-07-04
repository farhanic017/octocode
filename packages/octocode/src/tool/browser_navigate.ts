import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  url: Schema.String,
})

export const BrowserNavigateTool = Tool.define(
  "browser_navigate",
  Effect.gen(function* () {
    return {
      description: "Navigate to a URL in the browser.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_navigate",
            patterns: [params.url],
            always: [`browser_navigate:${params.url}`],
            metadata: { url: params.url },
          })

          try {
            const { chromium } = yield* Effect.promise(() => import("playwright"))

            const browser = yield* Effect.promise(() => chromium.launch({ headless: false }))
            const page = yield* Effect.promise(() => browser.newPage())
            yield* Effect.promise(() => page.goto(params.url))

            return {
              title: `Navigated to ${params.url}`,
              metadata: { url: params.url },
              output: `Opened ${params.url} in browser.`,
            }
          } catch (error) {
            return {
              title: `Failed to navigate to ${params.url}`,
              metadata: { url: params.url },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
