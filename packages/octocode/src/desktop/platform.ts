import { Effect, Context, Layer } from "effect"

export interface Interface {
  readonly getPlatform: () => Effect.Effect<PlatformInfo>
  readonly openApp: (app: string, args?: string[]) => Effect.Effect<void>
  readonly openTerminal: (command?: string, cwd?: string) => Effect.Effect<void>
  readonly getScreenshotCommand: () => Effect.Effect<string>
  readonly getMouseCommand: () => Effect.Effect<string>
}

export interface PlatformInfo {
  os: "windows" | "macos" | "linux"
  arch: string
  screenshotTool: string
  mouseTool: string
  terminalEmulator: string
}

export class Service extends Context.Service<Service, Interface>()("@octocode/DesktopPlatform") {}

function detectPlatform(): PlatformInfo {
  const os = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux"
  const arch = process.arch

  const screenshotTool = os === "windows" ? "snippingtool" : os === "macos" ? "screencapture" : "scrot"
  const mouseTool = os === "windows" ? "nut.js" : os === "macos" ? "cliclick" : "xdotool"
  const terminalEmulator = os === "windows" ? "wt" : os === "macos" ? "Terminal" : "gnome-terminal"

  return { os, arch, screenshotTool, mouseTool, terminalEmulator }
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const platform = detectPlatform()

    const getPlatform = () => Effect.succeed(platform)

    const openApp = (app: string, args?: string[]) =>
      Effect.sync(() => {
        const { execSync } = require("child_process")
        const argsStr = args?.join(" ") ?? ""

        if (platform.os === "windows") {
          execSync(`Start-Process "${app}" ${argsStr}`, { shell: "powershell" })
        } else if (platform.os === "macos") {
          execSync(`open -a "${app}" ${argsStr}`)
        } else {
          execSync(`${app} ${argsStr} &`, { shell: "bash" })
        }
      })

    const openTerminal = (command?: string, cwd?: string) =>
      Effect.sync(() => {
        const { execSync } = require("child_process")
        const dir = cwd ?? process.cwd()

        if (platform.os === "windows") {
          if (command) {
            execSync(`wt -d "${dir}" cmd /k "${command}"`, { shell: "powershell" })
          } else {
            execSync(`wt -d "${dir}"`, { shell: "powershell" })
          }
        } else if (platform.os === "macos") {
          if (command) {
            execSync(`osascript -e 'tell application "Terminal" to do script "${command} in front window"'`)
          } else {
            execSync(`open -a Terminal "${dir}"`)
          }
        } else {
          if (command) {
            execSync(`gnome-terminal --working-directory="${dir}" -- bash -c "${command}; exec bash"`)
          } else {
            execSync(`gnome-terminal --working-directory="${dir}"`)
          }
        }
      })

    const getScreenshotCommand = () =>
      Effect.succeed(platform.screenshotTool)

    const getMouseCommand = () =>
      Effect.succeed(platform.mouseTool)

    return Service.of({
      getPlatform,
      openApp,
      openTerminal,
      getScreenshotCommand,
      getMouseCommand,
    })
  }),
)

export const defaultLayer = Layer.suspend(() => layer)

export * as DesktopPlatform from "./platform"
