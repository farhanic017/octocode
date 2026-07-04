import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { requireDep } from "./lazy-dep"

export const Parameters = Schema.Struct({
  source: Schema.String,
  target: Schema.String,
  url: Schema.optional(Schema.String),
})

export const BrowserDragTool = Tool.define(
  "browser_drag",
  Effect.gen(function* () {
    return {
      description: "Drag an element from source to target in the browser by CSS selectors.",
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
            const pw = yield* Effect.promise(() => requireDep("playwright"))
            const { chromium } = pw

            const browser = yield* Effect.promise(() => chromium.launch({ headless: false }))
            const page = yield* Effect.promise(() => browser.newPage())

            if (params.url) {
              yield* Effect.promise(() => page.goto(params.url))
            }

            const sourceEl = yield* Effect.promise(() => page.$(params.source))
            const targetEl = yield* Effect.promise(() => page.$(params.target))

            if (sourceEl && targetEl) {
              const sourceBox = yield* Effect.promise(() => sourceEl.boundingBox())
              const targetBox = yield* Effect.promise(() => targetEl.boundingBox())

              if (sourceBox && targetBox) {
                yield* Effect.promise(() =>
                  page.mouse.move(
                    sourceBox.x + sourceBox.width / 2,
                    sourceBox.y + sourceBox.height / 2,
                  ),
                )
                yield* Effect.promise(() => page.mouse.down())
                yield* Effect.promise(() =>
                  page.mouse.move(
                    targetBox.x + targetBox.width / 2,
                    targetBox.y + targetBox.height / 2,
                    { steps: 10 },
                  ),
                )
                yield* Effect.promise(() => page.mouse.up())
              }
            }

            return {
              title: `Dragged from ${params.source} to ${params.target}`,
              metadata: { source: params.source, target: params.target },
              output: `Dragged element from ${params.source} to ${params.target}`,
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
