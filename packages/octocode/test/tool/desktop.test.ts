import { Effect, Layer } from "effect"
import { describe, expect } from "bun:test"
import { testEffect } from "../lib/effect"
import { DesktopControlTool } from "../../src/tool/desktop_control"
import { ScreenshotTool } from "../../src/tool/screenshot"
import { OpenAppTool } from "../../src/tool/open_app"
import { OpenTerminalTool } from "../../src/tool/open_terminal"
import { Agent } from "../../src/agent/agent"
import { Truncate } from "@/tool/truncate"
import * as Tool from "@/tool/tool"

const it = testEffect(Layer.mergeAll(Truncate.defaultLayer, Agent.defaultLayer))

describe("tool.desktop_control", () => {
  it.effect("registers with correct id", () =>
    Effect.gen(function* () {
      const info = yield* DesktopControlTool
      expect(info.id).toBe("desktop_control")
    }),
  )

  it.effect("init produces valid tool def", () =>
    Effect.gen(function* () {
      const info = yield* DesktopControlTool
      const def = yield* Tool.init(info)
      expect(def.id).toBe("desktop_control")
      expect(typeof def.description).toBe("string")
      expect(def.description.length).toBeGreaterThan(0)
    }),
  )
})

describe("tool.screenshot", () => {
  it.effect("registers with correct id", () =>
    Effect.gen(function* () {
      const info = yield* ScreenshotTool
      expect(info.id).toBe("screenshot")
    }),
  )

  it.effect("init produces valid tool def", () =>
    Effect.gen(function* () {
      const info = yield* ScreenshotTool
      const def = yield* Tool.init(info)
      expect(def.id).toBe("screenshot")
      expect(typeof def.description).toBe("string")
    }),
  )
})

describe("tool.open_app", () => {
  it.effect("registers with correct id", () =>
    Effect.gen(function* () {
      const info = yield* OpenAppTool
      expect(info.id).toBe("open_app")
    }),
  )

  it.effect("init produces valid tool def", () =>
    Effect.gen(function* () {
      const info = yield* OpenAppTool
      const def = yield* Tool.init(info)
      expect(def.id).toBe("open_app")
      expect(typeof def.description).toBe("string")
    }),
  )
})

describe("tool.open_terminal", () => {
  it.effect("registers with correct id", () =>
    Effect.gen(function* () {
      const info = yield* OpenTerminalTool
      expect(info.id).toBe("open_terminal")
    }),
  )

  it.effect("init produces valid tool def", () =>
    Effect.gen(function* () {
      const info = yield* OpenTerminalTool
      const def = yield* Tool.init(info)
      expect(def.id).toBe("open_terminal")
      expect(typeof def.description).toBe("string")
    }),
  )
})
