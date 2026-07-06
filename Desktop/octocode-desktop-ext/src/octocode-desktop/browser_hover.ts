import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { hover } from "./browser"

export const Parameters = Schema.Struct({
  selector: Schema.String,
})

export const BrowserHoverTool = Tool.define(
  "browser_hover",
  Effect.gen(function* () {
    return {
      description: "Hover over an element in the browser by CSS selector.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_hover",
            patterns: [params.selector],
            always: [`browser_hover:${params.selector}`],
            metadata: { selector: params.selector },
          })

          try {
            yield* Effect.promise(() => hover(params.selector))

            return {
              title: `Hovered over ${params.selector}`,
              metadata: { selector: params.selector },
              output: `Hovered: ${params.selector}`,
            }
          } catch (error) {
            return {
              title: `Failed to hover`,
              metadata: { selector: params.selector },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
