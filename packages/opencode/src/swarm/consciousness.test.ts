import { describe, expect, test } from "bun:test"
import { Consciousness } from "./consciousness"

describe("Consciousness", () => {
  test("pushState stores and retrieves state", () => {
    const c = new Consciousness()
    c.pushState("task", "build login", "coder")
    expect(c.getState("task")).toBe("build login")
  })

  test("getAllState returns all state entries", () => {
    const c = new Consciousness()
    c.pushState("a", 1)
    c.pushState("b", 2)
    const state = c.getAllState()
    expect(state.a).toBe(1)
    expect(state.b).toBe(2)
  })

  test("pushArtifact stores and retrieves artifacts", () => {
    const c = new Consciousness()
    c.pushArtifact("result", { files: 5 }, "coder")
    expect(c.getArtifact("result")).toEqual({ files: 5 })
  })

  test("pushProgress records progress event", () => {
    const c = new Consciousness()
    const event = c.pushProgress("researcher", "analyzing code")
    expect(event.type).toBe("progress")
    expect(event.source).toBe("researcher")
    expect(event.payload.message).toBe("analyzing code")
  })

  test("pushError records error event", () => {
    const c = new Consciousness()
    const event = c.pushError("coder", "compilation failed")
    expect(event.type).toBe("error")
    expect(event.payload.error).toBe("compilation failed")
  })

  test("pushCompletion records completion event", () => {
    const c = new Consciousness()
    const event = c.pushCompletion("tester", "all tests passed", "3/3 pass")
    expect(event.type).toBe("completion")
    expect(event.payload.result).toBe("all tests passed")
    expect(event.payload.summary).toBe("3/3 pass")
  })

  test("subscribe receives events", () => {
    const c = new Consciousness()
    const received: any[] = []
    c.subscribe("progress", (e) => received.push(e))
    c.pushProgress("coder", "working")
    expect(received.length).toBe(1)
    expect(received[0].payload.message).toBe("working")
  })

  test("wildcard subscription receives all events", () => {
    const c = new Consciousness()
    const received: any[] = []
    c.subscribe("*", (e) => received.push(e))
    c.pushProgress("a", "msg1")
    c.pushError("b", "err1")
    expect(received.length).toBe(2)
  })

  test("getRecentSummary formats events", () => {
    const c = new Consciousness()
    c.pushProgress("coder", "analyzing code")
    c.pushCompletion("coder", "done", "finished")
    c.pushState("phase", "complete")
    const summary = c.getRecentSummary()
    expect(summary).toContain("Progress:")
    expect(summary).toContain("Completions:")
    expect(summary).toContain("Live State:")
  })

  test("getFullContextForSwitch includes artifacts and instructions", () => {
    const c = new Consciousness()
    c.pushArtifact("output", "hello world", "coder")
    c.pushProgress("coder", "building")
    const ctx = c.getFullContextForSwitch("build login page")
    expect(ctx).toContain("build login page")
    expect(ctx).toContain("hello world")
    expect(ctx).toContain("DO NOT restart from scratch")
  })

  test("event log caps at maxEventLog", () => {
    const c = new Consciousness()
    for (let i = 0; i < 5010; i++) {
      c.pushProgress("agent", `msg ${i}`)
    }
    expect(c.getRecentSummary(10000)).toBeTruthy()
  })
})
