import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { rawToBase64 } from "./img-util"

export const Parameters = Schema.Struct({
  region: Schema.optional(
    Schema.Struct({
      x: Schema.Number,
      y: Schema.Number,
      width: Schema.Number,
      height: Schema.Number,
    }),
  ),
  format: Schema.optional(Schema.String),
})

export const ScreenshotTool = Tool.define(
  "screenshot",
  Effect.gen(function* () {
    return {
      description: "Capture a screenshot of the desktop or a specific region.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "screenshot",
            patterns: ["screenshot"],
            always: ["screenshot"],
          })

          const { screen, Region } = yield* Effect.promise(() => import("@nut-tree-fork/nut-js"))

          let img
          if (params.region) {
            img = yield* Effect.promise(() =>
              screen.grabRegion(new Region(params.region.x, params.region.y, params.region.width, params.region.height)),
            )
          } else {
            img = yield* Effect.promise(() => screen.grab())
          }

          const base64 = rawToBase64(img.data, img.width, img.height, img.channels)
          const format = params.format ?? "png"

          return {
            title: "Screenshot captured",
            metadata: { width: img.width, height: img.height, format },
            output: `Captured ${img.width}x${img.height} screenshot.`,
            attachments: [{ type: "image", data: base64, mimeType: `image/${format}` }],
          }
        }),
    }
  }),
)
