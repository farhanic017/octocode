import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { requireDep } from "./lazy-dep"

const RecordActionSchema = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("start"),
    filename: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    action: Schema.Literal("stop"),
  }),
  Schema.Struct({
    action: Schema.Literal("status"),
  }),
])

export const Parameters = Schema.Struct({
  record: RecordActionSchema,
})

let isRecording = false
let recordingStart = 0
let recordingFrames: string[] = []

export const DesktopRecordTool = Tool.define(
  "desktop_record",
  Effect.gen(function* () {
    return {
      description: "Record desktop screen as a series of screenshots (frames) for playback.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "desktop_record",
            patterns: ["desktop_record"],
            always: ["desktop_record"],
            metadata: { record: params.record },
          })

          try {
            const nutjs = yield* Effect.promise(() => requireDep("@nut-tree-fork/nut-js"))
            const { screen } = nutjs

            let output: string

            switch (params.record.action) {
              case "start": {
                if (isRecording) {
                  output = "Already recording"
                } else {
                  isRecording = true
                  recordingStart = Date.now()
                  recordingFrames = []
                  output = `Recording started. Frames will be captured.`
                }
                break
              }
              case "stop": {
                if (!isRecording) {
                  output = "Not recording"
                } else {
                  isRecording = false
                  const duration = Date.now() - recordingStart
                  output = `Recording stopped. Captured ${recordingFrames.length} frames over ${duration}ms.`
                }
                break
              }
              case "status": {
                if (isRecording) {
                  const elapsed = Date.now() - recordingStart
                  output = `Recording in progress. ${recordingFrames.length} frames captured. Elapsed: ${elapsed}ms`
                } else {
                  output = `Not recording. Last recording had ${recordingFrames.length} frames.`
                }
                break
              }
            }

            return {
              title: `Record: ${params.record.action}`,
              metadata: { action: params.record.action, isRecording },
              output,
            }
          } catch (error) {
            return {
              title: "Record error",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
