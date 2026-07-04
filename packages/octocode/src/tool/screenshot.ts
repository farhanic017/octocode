import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  region: Schema.optional(
    Schema.Struct({
      x: Schema.Number,
      y: Schema.Number,
      width: Schema.Number,
      height: Schema.Number,
    }),
  ),
  format: Schema.optional(Schema.Literals(["png", "jpg"])),
})

async function captureScreenshot(params: { region?: any; format?: string }) {
  const { screen, Region } = await import("@nut-tree-fork/nut-js")

  let img
  if (params.region) {
    img = await screen.capture(
      new Region(params.region.x, params.region.y, params.region.width, params.region.height),
    )
  } else {
    img = await screen.capture()
  }

  const format = params.format ?? "png"
  return {
    base64: img.toBase64(format),
    width: img.width,
    height: img.height,
    format,
  }
}

export const ScreenshotTool = Tool.define(
  "screenshot",
  Effect.gen(function* () {
    return {
      description:
        "Capture a screenshot of the desktop, a region, or a specific window. Returns base64 image.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "screenshot",
            patterns: ["screenshot"],
            always: ["screenshot"],
            metadata: { region: params.region, format: params.format },
          })

          try {
            const result = yield* Effect.promise(() => captureScreenshot(params))

            return {
              title: "Screenshot captured",
              metadata: { width: result.width, height: result.height, format: result.format },
              output: `Screenshot captured (${result.width}x${result.height}). Base64 length: ${result.base64.length}`,
              attachments: [{ type: "image" as const, data: result.base64, mimeType: `image/${result.format}` }],
            }
          } catch (error) {
            return {
              title: "Screenshot failed",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
