import { Effect, Context, Layer } from "effect"

export interface Interface {
  readonly start: (interval?: number) => Effect.Effect<void>
  readonly stop: () => Effect.Effect<void>
  readonly capture: () => Effect.Effect<string>
  readonly getLatest: () => Effect.Effect<string | null>
  readonly isRunning: () => Effect.Effect<boolean>
}

export class Service extends Context.Service<Service, Interface>()("@octocode/ScreenshotStream") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    let running = false
    let latestScreenshot: string | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null

    const captureOnce = async (): Promise<string> => {
      const { screen } = await import("@nut-tree-fork/nut-js")
      const img = await screen.capture()
      return img.toBase64("png")
    }

    const start = async (interval = 500): Promise<void> => {
      if (running) return
      running = true

      const captureLoop = async () => {
        while (running) {
          try {
            latestScreenshot = await captureOnce()
          } catch {
            // Ignore capture errors, keep last screenshot
          }
          await new Promise((r) => setTimeout(r, interval))
        }
      }

      captureLoop()
    }

    const stop = async (): Promise<void> => {
      running = false
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    return Service.of({
      start: (interval) => Effect.promise(() => start(interval)),
      stop: () => Effect.promise(() => stop()),
      capture: () => Effect.promise(() => captureOnce()),
      getLatest: () => Effect.succeed(latestScreenshot),
      isRunning: () => Effect.succeed(running),
    })
  }),
)

export const defaultLayer = Layer.suspend(() => layer)

export * as ScreenshotStream from "./stream"
