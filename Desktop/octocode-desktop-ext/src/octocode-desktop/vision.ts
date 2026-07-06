import { Effect, Context, Layer } from "effect"
import * as ScreenshotStream from "./stream"

export interface Interface {
  readonly captureWithContext: (action: string) => Effect.Effect<VisionResult>
  readonly describeScreen: () => Effect.Effect<string>
  readonly isVisionModel: (modelId: string) => Effect.Effect<boolean>
}

export interface VisionResult {
  screenshot: string
  context: string
  timestamp: number
}

export class Service extends Context.Service<Service, Interface>()("@octocode/DesktopVision") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const stream = yield* ScreenshotStream.Service

    const captureWithContext = async (action: string): Promise<VisionResult> => {
      const screenshot = await stream.capture()
      return {
        screenshot,
        context: `Action performed: ${action}. Current screen state captured.`,
        timestamp: Date.now(),
      }
    }

    const describeScreen = async (): Promise<string> => {
      const screenshot = await stream.capture()
      return `Screenshot captured (${screenshot.length} bytes base64). Vision model can analyze this image.`
    }

    const isVisionModel = (modelId: string): boolean => {
      const lower = modelId.toLowerCase()
      return /vision|multimodal|gpt-4o|gemini|claude|image|video|scout|flash/.test(lower)
    }

    return Service.of({
      captureWithContext: (action) => Effect.promise(() => captureWithContext(action)),
      describeScreen: () => Effect.promise(() => describeScreen()),
      isVisionModel: (modelId) => Effect.succeed(isVisionModel(modelId)),
    })
  }),
)

export const defaultLayer = Layer.suspend(() => layer)

export * as DesktopVision from "./vision"
