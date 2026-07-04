import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { requireDep } from "./lazy-dep"

export const Parameters = Schema.Struct({
  selector: Schema.String,
  value: Schema.String,
  url: Schema.optional(Schema.String),
})

export const BrowserSelectTool = Tool.define(
  "browser_select",
  Effect.gen(function* () {
    return {
      description: "Select an option from a dropdown in the browser by CSS selector and value.",
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
            const pw = yield* Effect.promise(() => requireDep("playwright"))
            const { chromium } = pw

            const browser = yield* Effect.promise(() => chromium.launch({ headless: false }))
            const page = yield* Effect.promise(() => browser.newPage())

            if (params.url) {
              yield* Effect.promise(() => page.goto(params.url))
            }

            yield* Effect.promise(() => page.selectOption(params.selector, params.value))

            return {
              title: `Selected "${params.value}" in ${params.selector}`,
              metadata: { selector: params.selector, value: params.value },
              output: `Selected "${params.value}" in ${params.selector}`,
            }
          } catch (error) {
            return {
              title: `Failed to select in ${params.selector}`,
              metadata: { selector: params.selector },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
