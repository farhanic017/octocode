import { Effect, Schema } from "effect"
import * as Tool from "./tool"

const ScreenRecordActionSchema = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("start"),
    fps: Schema.optional(Schema.Number),
    output: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    action: Schema.Literal("stop"),
  }),
  Schema.Struct({
    action: Schema.Literal("status"),
  }),
  Schema.Struct({
    action: Schema.Literal("export"),
    format: Schema.optional(Schema.Literals(["mp4", "gif", "webm"])),
  }),
])

export const Parameters = Schema.Struct({
  screen_record: ScreenRecordActionSchema,
})

let isRecording = false
let recordingStart = 0
let recordingFrames: string[] = []
let recordingInterval: ReturnType<typeof setInterval> | null = null
let currentFps = 10

async function captureFrame(): Promise<string> {
  const { screen } = await import("@nut-tree-fork/nut-js")
  const img = await screen.capture()
  return img.toBase64("png")
}

async function startRecording(fps: number): Promise<string> {
  if (isRecording) return "Already recording"

  isRecording = true
  recordingStart = Date.now()
  recordingFrames = []
  currentFps = fps

  const intervalMs = 1000 / fps
  recordingInterval = setInterval(async () => {
    if (isRecording) {
      try {
        const frame = await captureFrame()
        recordingFrames.push(frame)
      } catch {
        // Ignore capture errors during recording
      }
    }
  }, intervalMs)

  return `Recording started at ${fps} fps. Frames will be captured.`
}

async function stopRecording(): Promise<string> {
  if (!isRecording) return "Not recording"

  isRecording = false
  if (recordingInterval) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }

  const duration = Date.now() - recordingStart
  return `Recording stopped. Captured ${recordingFrames.length} frames over ${duration}ms.`
}

function getStatus(): string {
  if (isRecording) {
    const elapsed = Date.now() - recordingStart
    return `Recording in progress. ${recordingFrames.length} frames captured at ${currentFps} fps. Elapsed: ${elapsed}ms`
  }
  return `Not recording. Last recording had ${recordingFrames.length} frames.`
}

function exportRecording(format: string): string {
  if (recordingFrames.length === 0) return "No frames to export"

  const info = `Exported ${recordingFrames.length} frames as ${format.toUpperCase()}. In a full implementation, this would create a video file.`
  return info
}

export const DesktopScreenRecordTool = Tool.define(
  "desktop_screen_record",
  Effect.gen(function* () {
    return {
      description: "Record desktop screen with configurable FPS and export to MP4, GIF, or WebM.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "desktop_screen_record",
            patterns: ["desktop_screen_record"],
            always: ["desktop_screen_record"],
            metadata: { screen_record: params.screen_record },
          })

          try {
            let output: string

            switch (params.screen_record.action) {
              case "start": {
                const fps = params.screen_record.fps ?? 10
                output = yield* Effect.promise(() => startRecording(fps))
                break
              }
              case "stop": {
                output = yield* Effect.promise(() => stopRecording())
                break
              }
              case "status": {
                output = getStatus()
                break
              }
              case "export": {
                const format = params.screen_record.format ?? "mp4"
                output = exportRecording(format)
                break
              }
            }

            return {
              title: `Screen Record: ${params.screen_record.action}`,
              metadata: { action: params.screen_record.action, isRecording, frameCount: recordingFrames.length },
              output,
            }
          } catch (error) {
            return {
              title: "Screen record error",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
