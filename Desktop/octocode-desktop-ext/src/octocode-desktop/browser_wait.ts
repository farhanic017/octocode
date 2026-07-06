import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { waitForElement } from "./browser"

export const Parameters = Schema.Struct({
  selector: Schema.String,
  timeout: Schema.optional(Schema.Number),
})

export const BrowserWaitTool = Tool.define(
  "browser_wait",
  Effect.gen(function* () {
    return {
      description: "Wait for an element to appear in the browser.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_wait",
            patterns: ["browser_wait"],
            always: ["browser_wait"],
            metadata: { selector: params.selector },
          })

          try {
            const timeout = params.timeout ?? 10000
            yield* Effect.promise(() => waitForElement(params.selector, timeout))

            return {
              title: "Element appeared",
              metadata: { selector: params.selector, timeout },
              output: `Element ${params.selector} appeared within ${timeout}ms`,
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
