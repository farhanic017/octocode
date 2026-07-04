import { Effect, Context, Layer } from "effect"
import { WebSocketServer, WebSocket } from "ws"
import * as ScreenshotStream from "./stream"

export interface Interface {
  readonly start: (port?: number) => Effect.Effect<void>
  readonly stop: () => Effect.Effect<void>
  readonly broadcast: () => Effect.Effect<void>
  readonly getClientCount: () => Effect.Effect<number>
}

export class Service extends Context.Service<Service, Interface>()("@octocode/DesktopWebSocket") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const stream = yield* ScreenshotStream.Service

    let wss: WebSocketServer | null = null
    let clients: Set<WebSocket> = new Set()
    let broadcastInterval: ReturnType<typeof setInterval> | null = null
    let latestFrame: string | null = null

    const start = async (port = 8765): Promise<void> => {
      if (wss) return

      wss = new WebSocketServer({ port })

      wss.on("connection", (ws) => {
        clients.add(ws)
        console.log(`[DesktopWS] Client connected. Total: ${clients.size}`)

        ws.on("close", () => {
          clients.delete(ws)
          console.log(`[DesktopWS] Client disconnected. Total: ${clients.size}`)
        })

        ws.on("error", (error) => {
          console.error("[DesktopWS] Client error:", error)
          clients.delete(ws)
        })

        // Send latest frame if available
        if (latestFrame && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "frame", data: latestFrame, timestamp: Date.now() }))
        }
      })

      // Start streaming at 10fps
      stream.start(100)

      broadcastInterval = setInterval(() => {
        // Get latest screenshot and broadcast
        Effect.runPromise(stream.getLatest()).then((latest) => {
          if (!latest) return
          latestFrame = latest
          const message = JSON.stringify({ type: "frame", data: latest, timestamp: Date.now() })
          for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(message)
            }
          }
        }).catch(() => {})
      }, 100)

      console.log(`[DesktopWS] Server started on port ${port}`)
    }

    const stop = async (): Promise<void> => {
      if (broadcastInterval) {
        clearInterval(broadcastInterval)
        broadcastInterval = null
      }

      Effect.runPromise(stream.stop())

      if (wss) {
        for (const client of clients) {
          client.close()
        }
        clients.clear()
        wss.close()
        wss = null
      }
    }

    const broadcast = async (): Promise<void> => {
      const latest = await Effect.runPromise(stream.getLatest())
      if (!latest) return

      latestFrame = latest
      const message = JSON.stringify({
        type: "frame",
        data: latest,
        timestamp: Date.now(),
      })

      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      }
    }

    const getClientCount = (): number => {
      return clients.size
    }

    return Service.of({
      start: (port) => Effect.promise(() => start(port)),
      stop: () => Effect.promise(() => stop()),
      broadcast: () => Effect.promise(() => broadcast()),
      getClientCount: () => Effect.succeed(getClientCount()),
    })
  }),
)

export const defaultLayer = Layer.suspend(() => layer)

export * as DesktopWebSocket from "./websocket"
