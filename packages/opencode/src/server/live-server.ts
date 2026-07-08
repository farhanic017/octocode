import { ChildProcess, spawn } from "child_process"
import { Log } from "@/util"

const log = Log.create({ service: "live-server" })

export interface ServerInfo {
  id: string
  port: number
  process: ChildProcess | null
  url: string
  status: "running" | "stopped" | "error"
  sessionId: string
  command: string
  startedAt: number
}

const servers = new Map<string, ServerInfo>()
let portCounter = 3000

function generateId(): string {
  return `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function findAvailablePort(): number {
  while (portCounter < 10000) {
    const port = portCounter++
    const used = Array.from(servers.values()).some((s) => s.port === port)
    if (!used) return port
  }
  return portCounter++
}

export function startServer(
  sessionId: string,
  command: string,
  cwd?: string,
): ServerInfo {
  const existing = Array.from(servers.values()).find(
    (s) => s.sessionId === sessionId && s.status === "running",
  )
  if (existing) {
    log.info("server already running", { sessionId, port: existing.port })
    return existing
  }

  const port = findAvailablePort()
  const id = generateId()

  const fullCommand = command.includes("port") ? command : `${command} --port ${port}`

  log.info("starting server", { id, sessionId, port, command: fullCommand })

  const proc = spawn("sh", ["-c", fullCommand], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    detached: true,
    stdio: "ignore",
  })

  proc.on("error", (err) => {
    log.error("server error", { id, error: err.message })
    const info = servers.get(id)
    if (info) info.status = "error"
  })

  proc.on("exit", (code) => {
    log.info("server exited", { id, code })
    const info = servers.get(id)
    if (info) {
      info.status = "stopped"
      info.process = null
    }
  })

  proc.unref()

  const info: ServerInfo = {
    id,
    port,
    process: proc,
    url: `http://localhost:${port}`,
    status: "running",
    sessionId,
    command: fullCommand,
    startedAt: Date.now(),
  }

  servers.set(id, info)
  return info
}

export function stopServer(id: string): boolean {
  const info = servers.get(id)
  if (!info || !info.process) return false

  log.info("stopping server", { id })
  info.process.kill("SIGTERM")
  info.status = "stopped"
  info.process = null
  return true
}

export function stopAllForSession(sessionId: string): number {
  let count = 0
  for (const [id, info] of servers) {
    if (info.sessionId === sessionId && info.status === "running") {
      stopServer(id)
      count++
    }
  }
  return count
}

export function getServer(id: string): ServerInfo | undefined {
  return servers.get(id)
}

export function getServersForSession(sessionId: string): ServerInfo[] {
  return Array.from(servers.values()).filter((s) => s.sessionId === sessionId)
}

export function getAllRunningServers(): ServerInfo[] {
  return Array.from(servers.values()).filter((s) => s.status === "running")
}

export function restartServer(id: string): ServerInfo | null {
  const info = servers.get(id)
  if (!info) return null

  stopServer(id)
  return startServer(info.sessionId, info.command)
}

export function getServerUrl(id: string): string | undefined {
  return servers.get(id)?.url
}

export function isServerRunning(id: string): boolean {
  return servers.get(id)?.status === "running"
}
