import { spawn, type ChildProcess } from "child_process"
import { join } from "path"

let proc: ChildProcess | null = null
let idCounter = 0
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
let buffer = ""

function ensureProc(): ChildProcess {
  if (proc && proc.exitCode === null) return proc

  const script = join(import.meta.dir, "browser-server.cjs")
  proc = spawn("node", [script], { stdio: ["pipe", "pipe", "pipe"] })

  proc.stdout!.on("data", (data: Buffer) => {
    buffer += data.toString()
    const lines = buffer.split("\n")
    buffer = lines.pop()!
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const msg = JSON.parse(line)
        const p = pending.get(msg.id)
        if (p) {
          pending.delete(msg.id)
          if (msg.error) p.reject(new Error(msg.error))
          else p.resolve(msg.result)
        }
      } catch {}
    }
  })

  proc.on("exit", () => {
    for (const p of pending.values()) p.reject(new Error("Browser process exited"))
    pending.clear()
    proc = null
  })

  return proc
}

function send(msg: Record<string, unknown>): Promise<any> {
  const p = ensureProc()
  const id = ++idCounter
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    p.stdin!.write(JSON.stringify({ ...msg, id }) + "\n")
  })
}

export async function navigate(url: string): Promise<{ title: string; url: string }> {
  return send({ action: "navigate", url })
}

export async function screenshot(selector?: string): Promise<{ base64: string; size: number }> {
  return send({ action: "screenshot", selector })
}

export async function evaluate(script: string): Promise<any> {
  return send({ action: "evaluate", script })
}

export async function click(selector: string): Promise<void> {
  return send({ action: "click", selector })
}

export async function type(selector: string, text: string): Promise<void> {
  return send({ action: "type", selector, text })
}

export async function hover(selector: string): Promise<void> {
  return send({ action: "hover", selector })
}

export async function select(selector: string, value: string): Promise<void> {
  return send({ action: "select", selector, value })
}

export async function drag(source: string, target: string): Promise<void> {
  return send({ action: "drag", source, target })
}

export async function waitForElement(selector: string, timeout = 10000): Promise<void> {
  return send({ action: "wait", selector, timeout })
}

export async function getTitle(): Promise<string> {
  const r = await send({ action: "title" })
  return r.title
}

export async function currentUrl(): Promise<string> {
  const r = await send({ action: "title" })
  return r.url
}

export async function closeBrowser(): Promise<void> {
  try { await send({ action: "close" }) } catch {}
  if (proc) { proc.kill(); proc = null }
}

export async function isAlive(): Promise<boolean> {
  try {
    await send({ action: "title" })
    return true
  } catch {
    return false
  }
}
