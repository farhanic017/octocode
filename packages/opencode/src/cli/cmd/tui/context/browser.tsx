import { createContext, useContext, createSignal, onMount } from "solid-js"
import { spawn } from "child_process"
import { setLinkNavigator } from "@/cli/cmd/tui/ui/link"
import { setGlobalNavigator } from "@/cli/cmd/tui/util/open-url"

const ctx = createContext<{
  start: () => Promise<void>
  stop: () => void
  navigate: (url: string) => Promise<void>
  isRunning: () => boolean
  lastUrl: () => string | null
}>()

let browserProc: any = null
let pendingMap = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
let idCounter = 0
let buffer = ""
let savedUrl: string | null = null

function send(msg: Record<string, unknown>): Promise<any> {
  if (!browserProc) return Promise.reject(new Error("Browser not running"))
  const id = ++idCounter
  return new Promise((resolve, reject) => {
    pendingMap.set(id, { resolve, reject })
    browserProc.stdin!.write(JSON.stringify({ ...msg, id }) + "\n")
  })
}

export function BrowserProvider(props: { children: any }) {
  const [running, setRunning] = createSignal(false)
  const [url, setUrl] = createSignal<string | null>(null)

  onMount(() => {
    const navigateAll = async (url: string) => {
      if (!running()) {
        try { await startBrowser() } catch { return }
      }
      savedUrl = url
      setUrl(url)
      await send({ action: "navigate", url })
    }
    setLinkNavigator(navigateAll)
    setGlobalNavigator(navigateAll)
  })

  async function startBrowser() {
    if (running()) return
    const { execSync } = await import("child_process")
    let serverPath: string
    try {
      const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim()
      serverPath = globalRoot + "/octocode-desktop-ext/src/octocode-desktop/browser-server.cjs"
    } catch {
      setRunning(false)
      return
    }
    const proc = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "pipe"] })
    browserProc = proc

    proc.stdout!.on("data", (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split("\n")
      buffer = lines.pop()!
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg = JSON.parse(line)
          const p = pendingMap.get(msg.id)
          if (p) {
            pendingMap.delete(msg.id)
            if (msg.error) p.reject(new Error(msg.error))
            else p.resolve(msg.result)
          }
        } catch {}
      }
    })

    proc.on("exit", () => {
      for (const p of pendingMap.values()) p.reject(new Error("Browser exited"))
      pendingMap.clear()
      browserProc = null
      setRunning(false)
    })

    setRunning(true)
  }

  function stopBrowser() {
    if (browserProc) {
      browserProc.kill()
      browserProc = null
    }
    setRunning(false)
  }

  async function navigate(navigateUrl: string) {
    if (!running()) await startBrowser()
    savedUrl = navigateUrl
    setUrl(navigateUrl)
    await send({ action: "navigate", url: navigateUrl })
  }

  return (
    <ctx.Provider value={{ start: startBrowser, stop: stopBrowser, navigate, isRunning: running, lastUrl: url }}>
      {props.children}
    </ctx.Provider>
  )
}

export function useBrowser() {
  return useContext(ctx)
}
