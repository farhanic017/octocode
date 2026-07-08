import { describe, expect, test } from "bun:test"
import { LoopDetector } from "./loop-detector"

describe("LoopDetector", () => {
  test("no loops with fewer handoffs than threshold", () => {
    const d = new LoopDetector(3)
    d.recordHandoff("a", "b")
    d.recordHandoff("b", "c")
    expect(d.isLooping()).toBe(false)
  })

  test("detects same-pair loop at threshold", () => {
    const d = new LoopDetector(3)
    d.recordHandoff("a", "b")
    d.recordHandoff("a", "b")
    d.recordHandoff("a", "b")
    expect(d.isLooping()).toBe(true)
  })

  test("detects A-B-A-B pattern", () => {
    const d = new LoopDetector(2)
    d.recordHandoff("a", "b")
    d.recordHandoff("b", "a")
    d.recordHandoff("a", "b")
    d.recordHandoff("b", "a")
    expect(d.isLooping()).toBe(true)
  })

  test("no loop with diverse handoffs", () => {
    const d = new LoopDetector(3)
    d.recordHandoff("a", "b")
    d.recordHandoff("b", "c")
    d.recordHandoff("c", "d")
    d.recordHandoff("d", "e")
    expect(d.isLooping()).toBe(false)
  })

  test("detectCycle finds repeating pattern", () => {
    const d = new LoopDetector()
    d.recordHandoff("a", "b")
    d.recordHandoff("b", "c")
    d.recordHandoff("c", "a")
    d.recordHandoff("a", "b")
    d.recordHandoff("b", "c")
    d.recordHandoff("c", "a")
    const cycle = d.detectCycle()
    expect(cycle.length).toBeGreaterThan(0)
  })

  test("summary returns handoff chain", () => {
    const d = new LoopDetector()
    d.recordHandoff("a", "b")
    d.recordHandoff("b", "c")
    expect(d.summary()).toBe("a->b -> b->c")
  })

  test("summary returns empty when no handoffs", () => {
    const d = new LoopDetector()
    expect(d.summary()).toBe("No handoffs yet")
  })

  test("reset clears state", () => {
    const d = new LoopDetector(2)
    d.recordHandoff("a", "b")
    d.recordHandoff("a", "b")
    expect(d.isLooping()).toBe(true)
    d.reset()
    expect(d.isLooping()).toBe(false)
    expect(d.summary()).toBe("No handoffs yet")
  })
})
