import { Effect, Context, Layer } from "effect"
import { captureScreenBase64 } from "./img-util"

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

    const start = async (interval = 500): Promise<void> => {
      if (running) return
      running = true

      const captureLoop = async () => {
        while (running) {
          try {
            latestScreenshot = await captureScreenBase64()
          } catch {}
          await new Promise((r) => setTimeout(r, interval))
        }
      }

      captureLoop()
    }

    const stop = async (): Promise<void> => {
      running = false
    }

    return Service.of({
      start: (interval) => Effect.promise(() => start(interval)),
      stop: () => Effect.promise(() => stop()),
      capture: () => Effect.promise(() => captureScreenBase64()),
      getLatest: () => Effect.succeed(latestScreenshot),
      isRunning: () => Effect.succeed(running),
    })
  }),
)

export const defaultLayer = Layer.suspend(() => layer)

export * as ScreenshotStream from "./stream"
