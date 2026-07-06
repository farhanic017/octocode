import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { drag } from "./browser"

export const Parameters = Schema.Struct({
  source: Schema.String,
  target: Schema.String,
})

export const BrowserDragTool = Tool.define(
  "browser_drag",
  Effect.gen(function* () {
    return {
      description: "Drag an element from source to target by CSS selectors.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "browser_drag",
            patterns: [params.source, params.target],
            always: [`browser_drag:${params.source}:${params.target}`],
            metadata: { source: params.source, target: params.target },
          })

          try {
            yield* Effect.promise(() => drag(params.source, params.target))

            return {
              title: `Dragged from ${params.source} to ${params.target}`,
              metadata: { source: params.source, target: params.target },
              output: `Dragged ${params.source} → ${params.target}`,
            }
          } catch (error) {
            return {
              title: "Drag failed",
              metadata: { source: params.source, target: params.target },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
