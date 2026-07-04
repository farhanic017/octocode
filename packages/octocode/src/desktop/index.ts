import { Effect, Context, Layer } from "effect"

export interface Interface {
  readonly control: (params: ControlParams) => Effect.Effect<ControlResult>
  readonly screenshot: (params: ScreenshotParams) => Effect.Effect<ScreenshotResult>
  readonly openApp: (params: OpenAppParams) => Effect.Effect<OpenAppResult>
  readonly openTerminal: (params: OpenTerminalParams) => Effect.Effect<OpenTerminalResult>
}

export type ControlAction =
  | { action: "click"; x: number; y: number; button?: "left" | "right" | "middle" }
  | { action: "double_click"; x: number; y: number }
  | { action: "move"; x: number; y: number }
  | { action: "drag"; from: { x: number; y: number }; to: { x: number; y: number } }
  | { action: "type"; text: string }
  | { action: "key"; key: string }
  | { action: "scroll"; x: number; y: number; direction: "up" | "down"; amount?: number }

export interface ControlParams {
  action: ControlAction
  screenshotAfter?: boolean
}

export interface ControlResult {
  success: boolean
  message: string
  screenshot?: string
}

export interface ScreenshotParams {
  region?: { x: number; y: number; width: number; height: number }
  format?: "png" | "jpg"
}

export interface ScreenshotResult {
  base64: string
  width: number
  height: number
  format: string
}

export interface OpenAppParams {
  app: string
  args?: string[]
}

export interface OpenAppResult {
  success: boolean
  message: string
}

export interface OpenTerminalParams {
  command?: string
  cwd?: string
  shell?: "powershell" | "cmd" | "bash"
}

export interface OpenTerminalResult {
  success: boolean
  message: string
}

export class Service extends Context.Service<Service, Interface>()("@octocode/Desktop") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const control = async (params: ControlParams): Promise<ControlResult> => {
      try {
        const { mouse, keyboard, Point, Button } = await import("@nut-tree-fork/nut-js")

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
            const keyMap: Record<string, any> = {
              "Enter": "Enter",
              "Tab": "Tab",
              "Escape": "Escape",
              "Backspace": "Backspace",
              "Delete": "Delete",
              "Space": "Space",
              "ArrowUp": "Up",
              "ArrowDown": "Down",
              "ArrowLeft": "Left",
              "ArrowRight": "Right",
              "Home": "Home",
              "End": "End",
              "PageUp": "PageUp",
              "PageDown": "PageDown",
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
        if (params.screenshotAfter) {
          const { screen } = await import("@nut-tree-fork/nut-js")
          const img = await screen.capture()
          screenshot = img.toBase64()
        }

        return {
          success: true,
          message: `Action ${params.action.action} completed`,
          screenshot,
        }
      } catch (error) {
        return {
          success: false,
          message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        }
      }
    }

    const screenshot = async (params: ScreenshotParams): Promise<ScreenshotResult> => {
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

    const openApp = async (params: OpenAppParams): Promise<OpenAppResult> => {
      try {
        const { execSync } = await import("child_process")
        const args = params.args?.join(" ") ?? ""

        if (process.platform === "win32") {
          execSync(`Start-Process "${params.app}" ${args}`, { shell: "powershell" })
        } else if (process.platform === "darwin") {
          execSync(`open -a "${params.app}" ${args}`)
        } else {
          execSync(`${params.app} ${args} &`, { shell: "bash" })
        }

        return {
          success: true,
          message: `Application ${params.app} launched`,
        }
      } catch (error) {
        return {
          success: false,
          message: `Failed to launch ${params.app}: ${error instanceof Error ? error.message : String(error)}`,
        }
      }
    }

    const openTerminal = async (params: OpenTerminalParams): Promise<OpenTerminalResult> => {
      try {
        const { execSync } = await import("child_process")
        const shell = params.shell ?? "powershell"
        const cwd = params.cwd ?? process.cwd()

        if (process.platform === "win32") {
          if (shell === "powershell") {
            execSync(`wt -d "${cwd}" powershell -NoLogo`, { shell: "powershell" })
          } else if (shell === "cmd") {
            execSync(`wt -d "${cwd}" cmd`, { shell: "powershell" })
          }
        } else if (process.platform === "darwin") {
          execSync(`open -a Terminal "${cwd}"`)
        } else {
          execSync(`gnome-terminal --working-directory="${cwd}"`, { shell: "bash" })
        }

        if (params.command) {
          await new Promise((r) => setTimeout(r, 500))
          const { keyboard } = await import("@nut-tree-fork/nut-js")
          await keyboard.type(params.command)
          await keyboard.pressKey("Enter")
        }

        return {
          success: true,
          message: `New ${shell} terminal opened at ${cwd}`,
        }
      } catch (error) {
        return {
          success: false,
          message: `Failed to open terminal: ${error instanceof Error ? error.message : String(error)}`,
        }
      }
    }

    return Service.of({
      control: (params) => Effect.promise(() => control(params)),
      screenshot: (params) => Effect.promise(() => screenshot(params)),
      openApp: (params) => Effect.promise(() => openApp(params)),
      openTerminal: (params) => Effect.promise(() => openTerminal(params)),
    })
  }),
)

export const defaultLayer = Layer.suspend(() => layer)

export * as Desktop from "./index"
export { ScreenshotStream } from "./stream"
export { DesktopVision } from "./vision"
export { DesktopWebSocket } from "./websocket"
