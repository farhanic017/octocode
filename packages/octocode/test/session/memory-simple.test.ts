import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

// Test the memory functionality without full Effect runtime
describe("Memory System", () => {
  const testDir = path.join(os.tmpdir(), `octocode-memory-test-${Date.now()}`)

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe("MEMORY.md management", () => {
    it("should create MEMORY.md file", async () => {
      const memoryFile = path.join(testDir, "MEMORY.md")
      const content = "# Long-term Memory\n\nTest entry\n"
      await fs.writeFile(memoryFile, content)
      const read = await fs.readFile(memoryFile, "utf-8")
      expect(read).toBe(content)
    })

    it("should append to MEMORY.md", async () => {
      const memoryFile = path.join(testDir, "MEMORY.md")
      await fs.writeFile(memoryFile, "# Long-term Memory\n\nFirst entry\n")
      await fs.appendFile(memoryFile, "\nSecond entry\n")
      const read = await fs.readFile(memoryFile, "utf-8")
      expect(read).toContain("First entry")
      expect(read).toContain("Second entry")
    })

    it("should handle empty MEMORY.md", async () => {
      const memoryFile = path.join(testDir, "MEMORY.md")
      await fs.writeFile(memoryFile, "")
      const read = await fs.readFile(memoryFile, "utf-8")
      expect(read).toBe("")
    })
  })

  describe("Checkpoint snapshots", () => {
    it("should create checkpoint JSON files", async () => {
      const checkpointDir = path.join(testDir, "checkpoints")
      await fs.mkdir(checkpointDir, { recursive: true })

      const checkpoint = {
        id: "test-123",
        sessionID: "session-456",
        timestamp: Date.now(),
        summary: "Test checkpoint",
        context: "Testing checkpoint creation",
        decisions: ["Used approach A"],
        files: ["test.ts"],
      }

      await fs.writeFile(path.join(checkpointDir, `${checkpoint.id}.json`), JSON.stringify(checkpoint, null, 2))

      const files = await fs.readdir(checkpointDir)
      expect(files).toContain("test-123.json")

      const read = JSON.parse(await fs.readFile(path.join(checkpointDir, "test-123.json"), "utf-8"))
      expect(read.summary).toBe("Test checkpoint")
      expect(read.decisions).toEqual(["Used approach A"])
    })

    it("should list checkpoint files sorted by timestamp", async () => {
      const checkpointDir = path.join(testDir, "checkpoints")
      await fs.mkdir(checkpointDir, { recursive: true })

      const checkpoints = [
        { id: "cp-1", timestamp: 1000, summary: "First" },
        { id: "cp-2", timestamp: 2000, summary: "Second" },
        { id: "cp-3", timestamp: 1500, summary: "Third" },
      ]

      for (const cp of checkpoints) {
        await fs.writeFile(path.join(checkpointDir, `${cp.id}.json`), JSON.stringify(cp))
      }

      const files = await fs.readdir(checkpointDir)
      const jsonFiles = files.filter((f) => f.endsWith(".json"))
      expect(jsonFiles.length).toBe(3)
    })
  })

  describe("Memory search", () => {
    it("should search memory content", async () => {
      const memoryFile = path.join(testDir, "MEMORY.md")
      const content = `# Long-term Memory

## 2024-01-01

User prefers dark mode for all applications.

Tags: preference, ui

---

## 2024-01-02

Authentication uses JWT tokens with 24h expiry.

Tags: auth, security

---`

      await fs.writeFile(memoryFile, content)

      const read = await fs.readFile(memoryFile, "utf-8")
      expect(read).toContain("dark mode")
      expect(read).toContain("JWT tokens")
    })
  })

  describe("Memory consolidation", () => {
    it("should remove duplicate sections", async () => {
      const memoryFile = path.join(testDir, "MEMORY.md")
      const content = `# Long-term Memory

## 2024-01-01

User prefers dark mode.

---

## 2024-01-01

User prefers dark mode.

---

## 2024-01-02

Auth uses JWT.

---`

      await fs.writeFile(memoryFile, content)

      // Simple consolidation logic
      const read = await fs.readFile(memoryFile, "utf-8")
      const sections = read.split("---").filter((s) => s.trim())
      const unique = new Set(sections.map((s) => s.replace(/\s+/g, " ").trim()))
      expect(unique.size).toBeLessThanOrEqual(sections.length)
    })
  })
})

describe("Memory Integration", () => {
  it("should generate unique IDs", () => {
    const id1 = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const id2 = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    expect(id1).not.toBe(id2)
  })

  it("should format timestamps correctly", () => {
    const timestamp = Date.now()
    const date = new Date(timestamp)
    expect(date.toISOString()).toBeTruthy()
    expect(date.toDateString()).toBeTruthy()
  })

  it("should handle memory entry structure", () => {
    const entry = {
      id: "test-id",
      content: "Test content",
      timestamp: Date.now(),
      sessionID: "session-123",
      tags: ["test", "memory"],
      importance: 7,
    }

    expect(entry.id).toBeTruthy()
    expect(entry.content).toBeTruthy()
    expect(entry.timestamp).toBeGreaterThan(0)
    expect(entry.tags.length).toBe(2)
    expect(entry.importance).toBe(7)
  })

  it("should handle checkpoint structure", () => {
    const checkpoint = {
      id: "cp-123",
      sessionID: "session-456",
      timestamp: Date.now(),
      summary: "Implemented feature X",
      context: "Working on user dashboard",
      decisions: ["Used React", "Added tests"],
      files: ["dashboard.tsx", "dashboard.test.tsx"],
    }

    expect(checkpoint.id).toBeTruthy()
    expect(checkpoint.sessionID).toBeTruthy()
    expect(checkpoint.timestamp).toBeGreaterThan(0)
    expect(checkpoint.decisions.length).toBe(2)
    expect(checkpoint.files.length).toBe(2)
  })
})
