import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  command: Schema.optional(Schema.String),
  cwd: Schema.optional(Schema.String),
  shell: Schema.optional(Schema.Literals(["powershell", "cmd", "bash"])),
})

async function openNewTerminal(params: { command?: string; cwd?: string; shell?: string }) {
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
}

export const OpenTerminalTool = Tool.define(
  "open_terminal",
  Effect.gen(function* () {
    return {
      description:
        "Open a new terminal window and optionally run a command. Supports PowerShell, CMD, and Bash.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "open_terminal",
            patterns: ["open_terminal"],
            always: ["open_terminal"],
            metadata: { command: params.command, cwd: params.cwd, shell: params.shell },
          })

          try {
            yield* Effect.promise(() => openNewTerminal(params))

            return {
              title: "Terminal opened",
              metadata: { shell: params.shell ?? "powershell", cwd: params.cwd ?? process.cwd() },
              output: `New ${params.shell ?? "powershell"} terminal opened at ${params.cwd ?? process.cwd()}${params.command ? `. Running: ${params.command}` : ""}`,
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
