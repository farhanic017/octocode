import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { select } from "./browser"

export const Parameters = Schema.Struct({
  selector: Schema.String,
  value: Schema.String,
})

export const BrowserSelectTool = Tool.define(
  "browser_select",
  Effect.gen(function* () {
    return {
      description: "Select an option from a dropdown in the browser.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_select",
            patterns: [params.selector],
            always: [`browser_select:${params.selector}`],
            metadata: { selector: params.selector, value: params.value },
          })

          try {
            yield* Effect.promise(() => select(params.selector, params.value))

            return {
              title: `Selected "${params.value}" in ${params.selector}`,
              metadata: { selector: params.selector, value: params.value },
              output: `Selected "${params.value}" in ${params.selector}`,
            }
          } catch (error) {
            return {
              title: `Failed to select`,
              metadata: { selector: params.selector },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
