import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { click, currentUrl } from "./browser"

export const Parameters = Schema.Struct({
  selector: Schema.String,
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
            yield* Effect.promise(() => click(params.selector))
            const url = yield* Effect.promise(() => currentUrl())

            return {
              title: `Clicked ${params.selector}`,
              metadata: { selector: params.selector, url },
              output: `Clicked: ${params.selector}`,
            }
          } catch (error) {
            return {
              title: `Failed to click`,
              metadata: { selector: params.selector },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
