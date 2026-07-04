import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { requireDep } from "./lazy-dep"

const ControlActionSchema = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("click"),
    x: Schema.Number,
    y: Schema.Number,
    button: Schema.optional(Schema.Literals(["left", "right", "middle"])),
  }),
  Schema.Struct({
    action: Schema.Literal("double_click"),
    x: Schema.Number,
    y: Schema.Number,
  }),
  Schema.Struct({
    action: Schema.Literal("move"),
    x: Schema.Number,
    y: Schema.Number,
  }),
  Schema.Struct({
    action: Schema.Literal("drag"),
    from: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
    to: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
  }),
  Schema.Struct({
    action: Schema.Literal("type"),
    text: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("key"),
    key: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("scroll"),
    x: Schema.Number,
    y: Schema.Number,
    direction: Schema.Literals(["up", "down"]),
    amount: Schema.optional(Schema.Number),
  }),
])

export const Parameters = Schema.Struct({
  action: ControlActionSchema,
  screenshot_after: Schema.optional(Schema.Boolean),
})

async function executeAction(params: { action: any; screenshot_after?: boolean }) {
  const nutjs = await requireDep("@nut-tree-fork/nut-js")
  const { mouse, keyboard, Point, Button } = nutjs

  switch (params.action.action) {
    case "click": {
      await mouse.setPosition(new Point(params.action.x, params.action.y))
      const btn = params.action.button === "right" ? Button.RIGHT : Button.LEFT
      await mouse.click(btn)
      break
    }
    case "double_click": {
      await mouse.setPosition(new Point(params.action.x, params.action.y))
      await mouse.doubleClick(Button.LEFT)
      break
    }
    case "move": {
      await mouse.setPosition(new Point(params.action.x, params.action.y))
      break
    }
    case "drag": {
      await mouse.setPosition(new Point(params.action.from.x, params.action.from.y))
      await mouse.drag(new Point(params.action.to.x, params.action.to.y))
      break
    }
    case "type": {
      await keyboard.type(params.action.text)
      break
    }
    case "key": {
      const keyMap: Record<string, string> = {
        Enter: "Enter",
        Tab: "Tab",
        Escape: "Escape",
        Backspace: "Backspace",
        Delete: "Delete",
        Space: "Space",
        ArrowUp: "Up",
        ArrowDown: "Down",
        ArrowLeft: "Left",
        ArrowRight: "Right",
        Home: "Home",
        End: "End",
        PageUp: "PageUp",
        PageDown: "PageDown",
      }
      const mappedKey = keyMap[params.action.key] ?? params.action.key
      await keyboard.pressKey(mappedKey)
      break
    }
    case "scroll": {
      await mouse.setPosition(new Point(params.action.x, params.action.y))
      const scrolls = params.action.amount ?? 3
      if (params.action.direction === "up") {
        await mouse.scrollUp(scrolls)
      } else {
        await mouse.scrollDown(scrolls)
      }
      break
    }
  }

  let screenshot: string | undefined
  if (params.screenshot_after) {
    const nutjs = await requireDep("@nut-tree-fork/nut-js")
    const img = await nutjs.screen.capture()
    screenshot = img.toBase64()
  }

  return screenshot
}

export const DesktopControlTool = Tool.define(
  "desktop_control",
  Effect.gen(function* () {
    return {
      description:
        "Control mouse and keyboard on the desktop. Click, type, scroll, drag. Use coordinates from screenshots.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "desktop_control",
            patterns: ["desktop_control"],
            always: ["desktop_control"],
            metadata: { action: params.action },
          })

          try {
            const screenshot = yield* Effect.promise(() => executeAction(params))

            const output = screenshot
              ? `Action ${params.action.action} completed. Screenshot captured.`
              : `Action ${params.action.action} completed successfully.`

            return {
              title: `Desktop: ${params.action.action}`,
              metadata: { action: params.action.action, success: true },
              output,
              attachments: screenshot
                ? [{ type: "image" as const, data: screenshot, mimeType: "image/png" }]
                : undefined,
            }
          } catch (error) {
            return {
              title: `Desktop: ${params.action.action} failed`,
              metadata: { action: params.action.action, success: false },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
