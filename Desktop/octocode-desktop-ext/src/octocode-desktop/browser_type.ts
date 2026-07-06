import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { type as fill, currentUrl } from "./browser"

export const Parameters = Schema.Struct({
  selector: Schema.String,
  text: Schema.String,
})

export const BrowserTypeTool = Tool.define(
  "browser_type",
  Effect.gen(function* () {
    return {
      description: "Type text into an input field in the browser by CSS selector.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_type",
            patterns: [params.selector],
            always: [`browser_type:${params.selector}`],
            metadata: { selector: params.selector, text: params.text },
          })

          try {
            yield* Effect.promise(() => fill(params.selector, params.text))
            const url = yield* Effect.promise(() => currentUrl())

            return {
              title: `Typed into ${params.selector}`,
              metadata: { selector: params.selector, url },
              output: `Typed "${params.text}" into ${params.selector}`,
            }
          } catch (error) {
            return {
              title: `Failed to type`,
              metadata: { selector: params.selector },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
