import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  action: Schema.String,
  text: Schema.optional(Schema.String),
})

export const DesktopClipboardTool = Tool.define(
  "desktop_clipboard",
  Effect.gen(function* () {
    return {
      description: "Read from or write to the system clipboard. Actions: 'get', 'set'.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "desktop_clipboard",
            patterns: ["desktop_clipboard"],
            always: ["desktop_clipboard"],
            metadata: { action: params.action },
          })

          try {
            const clipboardy = yield* Effect.promise(() => import("clipboardy"))
            let output: string

            if (params.action === "get") {
              const content = yield* Effect.promise(() => clipboardy.read())
              output = `Clipboard: "${content}"`
            } else if (params.action === "set" && params.text) {
              yield* Effect.promise(() => clipboardy.write(params.text!))
              output = `Set clipboard to: "${params.text}"`
            } else {
              output = `Unknown action: ${params.action}`
            }

            return {
              title: `Clipboard: ${params.action}`,
              metadata: { action: params.action },
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
