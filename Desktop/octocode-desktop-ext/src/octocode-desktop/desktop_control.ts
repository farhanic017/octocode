import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  action: Schema.Struct({
    action: Schema.String,
    x: Schema.optional(Schema.Number),
    y: Schema.optional(Schema.Number),
    button: Schema.optional(Schema.String),
    from: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number })),
    to: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number })),
    text: Schema.optional(Schema.String),
    key: Schema.optional(Schema.String),
    direction: Schema.optional(Schema.String),
    amount: Schema.optional(Schema.Number),
  }),
  screenshot_after: Schema.optional(Schema.Boolean),
})

async function executeAction(params: { action: any; screenshot_after?: boolean }) {
  const { mouse, keyboard, Point, Button, Key } = await import("@nut-tree-fork/nut-js")

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
      const { Key } = await import("@nut-tree-fork/nut-js")
      const keyMap: Record<string, number> = {
        Enter: Key.Enter,
        Tab: Key.Tab,
        Escape: Key.Escape,
        Backspace: Key.Backspace,
        Delete: Key.Delete,
        Space: Key.Space,
        ArrowUp: Key.Up,
        ArrowDown: Key.Down,
        ArrowLeft: Key.Left,
        ArrowRight: Key.Right,
        Home: Key.Home,
        End: Key.End,
        PageUp: Key.PageUp,
        PageDown: Key.PageDown,
      }
      const mappedKey = keyMap[params.action.key] ?? Key[params.action.key]
      if (mappedKey !== undefined) {
        await keyboard.pressKey(mappedKey)
      }
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
    const { captureScreenBase64 } = await import("./img-util")
    screenshot = await captureScreenBase64()
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
