import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  app: Schema.String,
  args: Schema.optional(Schema.Array(Schema.String)),
})

async function launchApp(params: { app: string; args?: string[] }) {
  const { execSync } = await import("child_process")
  const args = params.args?.join(" ") ?? ""

  if (process.platform === "win32") {
    execSync(`Start-Process "${params.app}" ${args}`, { shell: "powershell" })
  } else if (process.platform === "darwin") {
    execSync(`open -a "${params.app}" ${args}`)
  } else {
    execSync(`${params.app} ${args} &`, { shell: "bash" })
  }
}

export const OpenAppTool = Tool.define(
  "open_app",
  Effect.gen(function* () {
    return {
      description: "Open any desktop application by name (e.g., 'chrome', 'notepad', 'vscode').",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "open_app",
            patterns: [params.app],
            always: [`open_app:${params.app}`],
            metadata: { app: params.app, args: params.args },
          })

          try {
            yield* Effect.promise(() => launchApp(params))

            return {
              title: `Opened ${params.app}`,
              metadata: { app: params.app },
              output: `Application ${params.app} launched successfully.`,
            }
          } catch (error) {
            return {
              title: `Failed to open ${params.app}`,
              metadata: { app: params.app },
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
