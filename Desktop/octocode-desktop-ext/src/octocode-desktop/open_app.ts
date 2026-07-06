import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  app: Schema.String,
  args: Schema.optional(Schema.Array(Schema.String)),
})

export const OpenAppTool = Tool.define(
  "open_app",
  Effect.gen(function* () {
    return {
      description: "Launch a desktop application by name.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "open_app",
            patterns: [params.app],
            always: [`open_app:${params.app}`],
            metadata: { app: params.app },
          })

          try {
            const { execSync } = yield* Effect.promise(() => import("child_process"))
            const args = params.args?.join(" ") ?? ""

            if (process.platform === "win32") {
              execSync(`Start-Process "${params.app}" ${args}`, { shell: "powershell", windowsHide: true })
            } else if (process.platform === "darwin") {
              execSync(`open -a "${params.app}" ${args}`)
            } else {
              execSync(`${params.app} ${args} &`, { shell: "bash" })
            }

            return {
              title: `Opened ${params.app}`,
              metadata: { app: params.app },
              output: `Launched ${params.app}`,
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
