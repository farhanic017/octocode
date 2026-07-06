import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  command: Schema.optional(Schema.String),
  cwd: Schema.optional(Schema.String),
  shell: Schema.optional(Schema.String),
})

export const OpenTerminalTool = Tool.define(
  "open_terminal",
  Effect.gen(function* () {
    return {
      description: "Open a new terminal window with optional command and working directory.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "open_terminal",
            patterns: ["open_terminal"],
            always: ["open_terminal"],
            metadata: { command: params.command, cwd: params.cwd },
          })

          try {
            const { execSync } = yield* Effect.promise(() => import("child_process"))
            const shell = params.shell ?? "powershell"
            const cwd = params.cwd ?? process.cwd()

            if (process.platform === "win32") {
              if (shell === "powershell") {
                execSync(`wt -d "${cwd}" powershell -NoLogo`, { shell: "powershell", windowsHide: true })
              } else if (shell === "cmd") {
                execSync(`wt -d "${cwd}" cmd`, { shell: "powershell", windowsHide: true })
              }
            } else if (process.platform === "darwin") {
              execSync(`open -a Terminal "${cwd}"`)
            } else {
              execSync(`gnome-terminal --working-directory="${cwd}"`, { shell: "bash" })
            }

            if (params.command) {
              yield* Effect.promise(() => new Promise((r) => setTimeout(r, 500)))
              const { keyboard, Key } = yield* Effect.promise(() => import("@nut-tree-fork/nut-js"))
              yield* Effect.promise(() => keyboard.type(params.command))
              yield* Effect.promise(() => keyboard.pressKey(Key.Enter))
            }

            return {
              title: `Opened ${shell} terminal`,
              metadata: { shell, cwd },
              output: `Terminal opened at ${cwd}${params.command ? ` with command: ${params.command}` : ""}`,
            }
          } catch (error) {
            return {
              title: "Failed to open terminal",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
