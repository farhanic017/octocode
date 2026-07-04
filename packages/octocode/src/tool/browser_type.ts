import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  selector: Schema.String,
  text: Schema.String,
  url: Schema.optional(Schema.String),
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
            const { chromium } = yield* Effect.promise(() => import("playwright"))

            const browser = yield* Effect.promise(() => chromium.launch({ headless: false }))
            const page = yield* Effect.promise(() => browser.newPage())

            if (params.url) {
              yield* Effect.promise(() => page.goto(params.url))
            }

            yield* Effect.promise(() => page.fill(params.selector, params.text))

            return {
              title: `Typed into ${params.selector}`,
              metadata: { selector: params.selector },
              output: `Typed "${params.text}" into ${params.selector}`,
            }
          } catch (error) {
            return {
              title: `Failed to type into ${params.selector}`,
              metadata: { selector: params.selector },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
