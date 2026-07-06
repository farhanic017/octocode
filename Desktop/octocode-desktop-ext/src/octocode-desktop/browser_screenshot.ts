import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { screenshot } from "./browser"

export const Parameters = Schema.Struct({
  selector: Schema.optional(Schema.String),
})

export const BrowserScreenshotTool = Tool.define(
  "browser_screenshot",
  Effect.gen(function* () {
    return {
      description: "Capture a screenshot of the browser viewport or a specific element.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_screenshot",
            patterns: ["browser_screenshot"],
            always: ["browser_screenshot"],
          })

          try {
            const result = yield* Effect.promise(() => screenshot(params.selector))

            return {
              title: "Browser screenshot captured",
              metadata: { selector: params.selector },
              output: `Screenshot captured. Size: ${result.size} bytes.`,
              attachments: [{ type: "image", data: result.base64, mimeType: "image/png" }],
            }
          } catch (error) {
            return {
              title: "Browser screenshot failed",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
