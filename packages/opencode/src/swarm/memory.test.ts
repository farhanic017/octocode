import { describe, expect, test, beforeEach } from "bun:test"
import { SharedMemory } from "./memory"
import { existsSync, rmSync } from "fs"
import { join } from "path"

const TEST_PATH = join(process.cwd(), ".octocode", "test-memory.json")

function cleanup() {
  if (existsSync(TEST_PATH)) rmSync(TEST_PATH)
}

describe("SharedMemory", () => {
  beforeEach(cleanup)

  test("stores and retrieves entries", () => {
    const mem = new SharedMemory(TEST_PATH)
    const entry = mem.store("knowledge", "coder", "TypeScript is statically typed")
    expect(entry.type).toBe("knowledge")
    expect(entry.agent).toBe("coder")
    expect(entry.content).toBe("TypeScript is statically typed")
  })

  test("persists to file", () => {
    const mem = new SharedMemory(TEST_PATH)
    mem.store("task", "researcher", "found 5 bugs")
    const mem2 = new SharedMemory(TEST_PATH)
    expect(mem2.getRecent(10).length).toBe(1)
  })

  test("query by type", () => {
    const mem = new SharedMemory(TEST_PATH)
    mem.store("knowledge", "coder", "info1")
    mem.store("task", "researcher", "info2")
    mem.store("knowledge", "writer", "info3")
    const results = mem.query({ type: "knowledge" })
    expect(results.length).toBe(2)
    expect(results.every((r) => r.type === "knowledge")).toBe(true)
  })

  test("query by agent", () => {
    const mem = new SharedMemory(TEST_PATH)
    mem.store("event", "coder", "info1")
    mem.store("event", "writer", "info2")
    const results = mem.query({ agent: "coder" })
    expect(results.length).toBe(1)
    expect(results[0].agent).toBe("coder")
  })

  test("query by tags", () => {
    const mem = new SharedMemory(TEST_PATH)
    mem.store("knowledge", "coder", "info1", { tags: ["auth", "login"] })
    mem.store("knowledge", "coder", "info2", { tags: ["ui"] })
    const results = mem.query({ tags: ["auth"] })
    expect(results.length).toBe(1)
  })

  test("query by search", () => {
    const mem = new SharedMemory(TEST_PATH)
    mem.store("knowledge", "coder", "TypeScript is great")
    mem.store("knowledge", "coder", "Python is also good")
    const results = mem.query({ search: "typescript" })
    expect(results.length).toBe(1)
    expect(results[0].content).toContain("TypeScript")
  })

  test("getAgentState returns stats", () => {
    const mem = new SharedMemory(TEST_PATH)
    mem.store("task", "coder", "task1")
    mem.store("task", "coder", "task2")
    mem.store("event", "coder", "event1")
    const state = mem.getAgentState("coder")
    expect(state.taskCount).toBe(2)
    expect(state.eventCount).toBe(1)
    expect(state.lastActivity).toBeTruthy()
  })

  test("getSummary returns counts", () => {
    const mem = new SharedMemory(TEST_PATH)
    mem.store("knowledge", "coder", "k1")
    mem.store("task", "researcher", "t1")
    mem.store("prediction", "coder", "p1")
    const summary = mem.getSummary()
    expect(summary.total).toBe(3)
    expect(summary.typeCounts.knowledge).toBe(1)
    expect(summary.agents).toContain("coder")
  })

  test("clear removes all entries", () => {
    const mem = new SharedMemory(TEST_PATH)
    mem.store("event", "agent", "msg")
    mem.clear()
    expect(mem.getRecent().length).toBe(0)
  })
})
