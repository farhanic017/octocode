/** @jsxImportSource solid-js */
import { createSignal, onCleanup, onMount } from "solid-js"

interface ViewportFrame {
  data: string
  timestamp: number
}

interface DesktopViewportProps {
  port?: number
  className?: string
}

export function DesktopViewport(props: DesktopViewportProps) {
  const [frame, setFrame] = createSignal<ViewportFrame | null>(null)
  const [connected, setConnected] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  const connect = () => {
    const port = props.port ?? 8765
    ws = new WebSocket(`ws://localhost:${port}`)

    ws.onopen = () => {
      setConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "frame") {
          setFrame({ data: data.data, timestamp: data.timestamp })
        }
      } catch {
        // Ignore parse errors
      }
    }

    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 2 seconds
      reconnectTimeout = setTimeout(connect, 2000)
    }

    ws.onerror = () => {
      setError("Failed to connect to desktop stream")
      setConnected(false)
    }
  }

  onMount(() => {
    connect()
  })

  onCleanup(() => {
    if (ws) {
      ws.close()
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
    }
  })

  const timeSinceLastFrame = () => {
    const f = frame()
    if (!f) return null
    const seconds = Math.floor((Date.now() - f.timestamp) / 1000)
    return `${seconds}s ago`
  }

  return (
    <div class={`desktop-viewport ${props.className ?? ""}`}>
      <div class="viewport-header">
        <span class="viewport-title">Live Preview</span>
        <span class={`viewport-status ${connected() ? "connected" : "disconnected"}`}>
          {connected() ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div class="viewport-content">
        {error() ? (
          <div class="viewport-error">{error()}</div>
        ) : frame() ? (
          <img
            src={`data:image/png;base64,${frame()!.data}`}
            alt="Desktop preview"
            class="viewport-image"
          />
        ) : (
          <div class="viewport-placeholder">
            {connected() ? "Waiting for frames..." : "Connecting..."}
          </div>
        )}
      </div>
      {frame() && (
        <div class="viewport-footer">
          <span>Frame: {timeSinceLastFrame()}</span>
        </div>
      )}
    </div>
  )
}
