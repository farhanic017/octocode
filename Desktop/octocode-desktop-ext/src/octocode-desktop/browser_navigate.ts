import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { navigate } from "./browser"

export const Parameters = Schema.Struct({
  url: Schema.String,
})

export const BrowserNavigateTool = Tool.define(
  "browser_navigate",
  Effect.gen(function* () {
    return {
      description: "Navigate to a URL in the shared browser instance.",
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
            const result = yield* Effect.promise(() => navigate(params.url))

            return {
              title: `Navigated to ${result.title}`,
              metadata: { url: result.url, title: result.title },
              output: `Title: ${result.title}\nURL: ${result.url}`,
            }
          } catch (error) {
            return {
              title: `Failed to navigate`,
              metadata: { url: params.url },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
