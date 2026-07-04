import { Effect, Schema } from "effect"
import * as Tool from "./tool"

const ClipboardActionSchema = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("copy"),
  }),
  Schema.Struct({
    action: Schema.Literal("paste"),
  }),
  Schema.Struct({
    action: Schema.Literal("get"),
  }),
  Schema.Struct({
    action: Schema.Literal("set"),
    text: Schema.String,
  }),
])

export const Parameters = Schema.Struct({
  clipboard: ClipboardActionSchema,
})

export const DesktopClipboardTool = Tool.define(
  "desktop_clipboard",
  Effect.gen(function* () {
    return {
      description: "Read from or write to the system clipboard.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "desktop_clipboard",
            patterns: ["desktop_clipboard"],
            always: ["desktop_clipboard"],
            metadata: { clipboard: params.clipboard },
          })

          try {
            const { clipboard } = yield* Effect.promise(() => import("@nut-tree-fork/nut-js"))

            let output: string

            switch (params.clipboard.action) {
              case "copy": {
                const text = yield* Effect.promise(() => clipboard.getContent())
                output = `Copied to clipboard: "${text}"`
                break
              }
              case "paste": {
                yield* Effect.promise(() => clipboard.copyPaste())
                output = "Pasted from clipboard"
                break
              }
              case "get": {
                const content = yield* Effect.promise(() => clipboard.getContent())
                output = `Clipboard content: "${content}"`
                break
              }
              case "set": {
                yield* Effect.promise(() => clipboard.setContent(params.clipboard.text))
                output = `Set clipboard to: "${params.clipboard.text}"`
                break
              }
            }

            return {
              title: `Clipboard: ${params.clipboard.action}`,
              metadata: { action: params.clipboard.action },
              output,
            }
          } catch (error) {
            return {
              title: "Clipboard error",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
