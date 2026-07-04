import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  url: Schema.optional(Schema.String),
  selector: Schema.optional(Schema.String),
  format: Schema.optional(Schema.Literals(["png", "jpg"])),
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
            metadata: { url: params.url, selector: params.selector },
          })

          try {
            const { chromium } = yield* Effect.promise(() => import("playwright"))

            const browser = yield* Effect.promise(() => chromium.launch({ headless: false }))
            const page = yield* Effect.promise(() => browser.newPage())

            if (params.url) {
              yield* Effect.promise(() => page.goto(params.url))
            }

            let screenshot: Buffer
            if (params.selector) {
              const element = yield* Effect.promise(() => page.$(params.selector))
              if (element) {
                screenshot = yield* Effect.promise(() => element.screenshot())
              } else {
                screenshot = yield* Effect.promise(() => page.screenshot())
              }
            } else {
              screenshot = yield* Effect.promise(() => page.screenshot())
            }

            const base64 = screenshot.toString("base64")
            const format = params.format ?? "png"

            return {
              title: "Browser screenshot captured",
              metadata: { format, selector: params.selector },
              output: `Screenshot captured. Base64 length: ${base64.length}`,
              attachments: [{ type: "image" as const, data: base64, mimeType: `image/${format}` }],
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
