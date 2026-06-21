import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import {
  loadBrain,
  saveBrain,
  trackSession,
  trackFile,
  trackProject,
  buildBrainGraph,
  mergeRelatedSessions,
  getBrainStats,
  type BrainData,
} from "../src/util/brain"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const TEST_BRAIN_DIR = path.join(os.tmpdir(), "octocode-brain-test")
const TEST_BRAIN_PATH = path.join(TEST_BRAIN_DIR, "brain.json")

// Mock the BRAIN_DIR for testing
beforeEach(() => {
  if (!fs.existsSync(TEST_BRAIN_DIR)) {
    fs.mkdirSync(TEST_BRAIN_DIR, { recursive: true })
  }
})

afterEach(() => {
  if (fs.existsSync(TEST_BRAIN_PATH)) {
    fs.unlinkSync(TEST_BRAIN_PATH)
  }
  if (fs.existsSync(TEST_BRAIN_DIR)) {
    fs.rmdirSync(TEST_BRAIN_DIR)
  }
})

function createEmptyBrain(): BrainData {
  return {
    files: {},
    projects: {},
    sessions: [],
    concepts: {},
    lastUpdated: Date.now(),
  }
}

describe("Brain Data System", () => {
  test("loadBrain returns empty brain when no file exists", () => {
    const brain = loadBrain()
    expect(brain).toBeDefined()
    expect(brain.files).toBeDefined()
    expect(brain.projects).toBeDefined()
    expect(brain.sessions).toBeDefined()
    expect(brain.concepts).toBeDefined()
  })

  test("trackSession adds a new session", () => {
    let brain = createEmptyBrain()
    brain = trackSession(brain, {
      id: "test-session-1",
      title: "Test Session",
      files: ["src/index.ts", "src/utils.ts"],
      summary: "Test summary",
      tokens: 1500,
      project: "test-project",
    })

    expect(brain.sessions).toHaveLength(1)
    expect(brain.sessions[0].id).toBe("test-session-1")
    expect(brain.sessions[0].title).toBe("Test Session")
    expect(brain.sessions[0].files).toEqual(["src/index.ts", "src/utils.ts"])
    expect(brain.sessions[0].tokens).toBe(1500)
  })

  test("trackSession updates existing session", () => {
    let brain = createEmptyBrain()
    brain = trackSession(brain, {
      id: "test-session-1",
      title: "Test Session",
      files: ["src/index.ts"],
    })
    brain = trackSession(brain, {
      id: "test-session-1",
      title: "Updated Session",
      files: ["src/index.ts", "src/utils.ts"],
    })

    expect(brain.sessions).toHaveLength(1)
    expect(brain.sessions[0].title).toBe("Updated Session")
    expect(brain.sessions[0].files).toHaveLength(2)
  })

  test("trackFile adds a new file", () => {
    let brain = createEmptyBrain()
    brain = trackFile(brain, "src/index.ts", "session-1")

    expect(Object.keys(brain.files)).toHaveLength(1)
    expect(brain.files["src/index.ts"]).toBeDefined()
    expect(brain.files["src/index.ts"].sessionCount).toBe(1)
    expect(brain.files["src/index.ts"].totalEdits).toBe(1)
  })

  test("trackFile increments file counts", () => {
    let brain = createEmptyBrain()
    brain = trackFile(brain, "src/index.ts", "session-1")
    brain = trackFile(brain, "src/index.ts", "session-2")

    expect(brain.files["src/index.ts"].sessionCount).toBe(2)
    expect(brain.files["src/index.ts"].totalEdits).toBe(2)
  })

  test("trackProject adds a new project", () => {
    let brain = createEmptyBrain()
    brain = trackProject(brain, "/path/to/my-project", "session-1")

    expect(Object.keys(brain.projects)).toHaveLength(1)
    expect(brain.projects["my-project"]).toBeDefined()
    expect(brain.projects["my-project"].totalSessions).toBe(1)
    expect(brain.projects["my-project"].sessions).toContain("session-1")
  })

  test("trackProject increments project counts", () => {
    let brain = createEmptyBrain()
    brain = trackProject(brain, "/path/to/my-project", "session-1")
    brain = trackProject(brain, "/path/to/my-project", "session-2")

    expect(brain.projects["my-project"].totalSessions).toBe(2)
    expect(brain.projects["my-project"].sessions).toHaveLength(2)
  })

  test("buildBrainGraph creates nodes and edges", () => {
    let brain = createEmptyBrain()
    brain = trackSession(brain, {
      id: "session-1",
      title: "Test Session",
      files: ["src/index.ts"],
    })
    brain = trackFile(brain, "src/index.ts", "session-1")
    brain = trackProject(brain, "/path/to/project", "session-1")

    const graph = buildBrainGraph(brain)

    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(graph.edges.length).toBeGreaterThanOrEqual(0)

    // Should have a project node
    const projectNode = graph.nodes.find((n) => n.type === "project")
    expect(projectNode).toBeDefined()

    // Should have a session node
    const sessionNode = graph.nodes.find((n) => n.type === "session")
    expect(sessionNode).toBeDefined()
  })

  test("mergeRelatedSessions updates file session counts", () => {
    let brain = createEmptyBrain()
    brain = trackSession(brain, {
      id: "session-1",
      title: "Session 1",
      files: ["src/index.ts"],
    })
    brain = trackSession(brain, {
      id: "session-2",
      title: "Session 2",
      files: ["src/index.ts"],
    })
    brain = trackFile(brain, "src/index.ts", "session-1")
    brain = trackFile(brain, "src/index.ts", "session-2")

    brain = mergeRelatedSessions(brain)

    expect(brain.files["src/index.ts"].sessionCount).toBe(2)
  })

  test("getBrainStats returns correct stats", () => {
    let brain = createEmptyBrain()
    brain = trackSession(brain, {
      id: "session-1",
      title: "Session 1",
      files: ["src/index.ts"],
    })
    brain = trackSession(brain, {
      id: "session-2",
      title: "Session 2",
      files: ["src/utils.ts"],
    })
    brain = trackFile(brain, "src/index.ts", "session-1")
    brain = trackFile(brain, "src/utils.ts", "session-2")
    brain = trackProject(brain, "/path/to/project", "session-1")

    const stats = getBrainStats(brain)

    expect(stats.totalSessions).toBe(2)
    expect(stats.totalFiles).toBe(2)
    expect(stats.totalProjects).toBe(1)
    expect(stats.topFiles).toHaveLength(2)
    expect(stats.topProjects).toHaveLength(1)
  })
})
