import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"
import { execSync } from "child_process"
import { startServer, stopServer, getServersForSession, getAllRunningServers } from "@/server/live-server"
import DESCRIPTION from "./browser.txt"

const Parameters = z.object({
  action: z.enum(["navigate", "start-server", "stop-server", "status"]).describe("Browser action"),
  url: z.string().optional().describe("URL to navigate to"),
  serverId: z.string().optional().describe("Server ID for stop-server"),
  command: z.string().optional().describe("Server command for start-server"),
  sessionId: z.string().optional().describe("Session ID"),
})

function open(url: string): boolean {
  try {
    if (process.platform === "win32") execSync(`start "" "${url}"`, { stdio: "ignore" })
    else if (process.platform === "darwin") execSync(`open "${url}"`, { stdio: "ignore" })
    else execSync(`xdg-open "${url}"`, { stdio: "ignore" })
    return true
  } catch { return false }
}

export const BrowserTool = Tool.define("browser", Effect.gen(function* () {
  return {
    description: DESCRIPTION,
    parameters: Parameters,
    execute: (params: z.infer<typeof Parameters>, ctx: Tool.Context) => Effect.gen(function* () {
      switch (params.action) {
        case "navigate": {
          if (!params.url) return { output: "URL required", title: "Browser", metadata: {} }
          return { output: open(params.url) ? `Opened ${params.url}` : "Failed to open", title: "Browser", metadata: { url: params.url } }
        }
        case "start-server": {
          if (!params.sessionId || !params.command) return { output: "Params required", title: "Server", metadata: {} }
          const s = startServer(params.sessionId, params.command)
          setTimeout(() => open(s.url), 2000)
          return { output: `Server at ${s.url}. Opening browser...`, title: "Server", metadata: { url: s.url } }
        }
        case "stop-server": {
          if (!params.serverId) return { output: "ID required", title: "Server", metadata: {} }
          return { output: stopServer(params.serverId) ? "Stopped" : "Not found", title: "Server", metadata: {} }
        }
        case "status": {
          const ss = params.sessionId ? getServersForSession(params.sessionId) : getAllRunningServers()
          return { output: ss.length ? ss.map((s: any) => s.url).join("\n") : "No servers", title: "Status", metadata: {} }
        }
        default: return { output: "Unknown", title: "Error", metadata: {} }
      }
    }).pipe(Effect.orDie),
  }
}))
