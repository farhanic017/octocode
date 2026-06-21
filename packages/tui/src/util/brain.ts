import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const BRAIN_DIR = path.join(os.homedir(), ".local", "share", "octo", "brain")
const OBSIDIAN_SYNC_DIR = path.join(os.homedir(), ".local", "share", "octo", "brain", "obsidian")

export interface BrainFile {
  path: string
  lastSession: string
  sessionCount: number
  totalEdits: number
  firstSeen: number
  lastSeen: number
}

export interface BrainProject {
  name: string
  rootPath: string
  files: string[]
  sessions: string[]
  lastActive: number
  totalSessions: number
}

export interface BrainSession {
  id: string
  title: string
  timestamp: number
  files: string[]
  summary: string
  tokens: number
  project?: string
}

export interface BrainConcept {
  name: string
  type: "file" | "project" | "feature" | "bug" | "concept"
  relatedFiles: string[]
  sessions: string[]
  lastMentioned: number
  mentionCount: number
}

export interface BrainData {
  files: Record<string, BrainFile>
  projects: Record<string, BrainProject>
  sessions: BrainSession[]
  concepts: Record<string, BrainConcept>
  lastUpdated: number
}

export interface BrainSyncQueue {
  pending: Array<{ type: string; data: unknown; timestamp: number }>
  lastSync: number
}

function ensureBrainDir(): void {
  if (!fs.existsSync(BRAIN_DIR)) {
    fs.mkdirSync(BRAIN_DIR, { recursive: true })
  }
}

function getBrainPath(): string {
  ensureBrainDir()
  return path.join(BRAIN_DIR, "brain.json")
}

export function loadBrain(): BrainData {
  try {
    const brainPath = getBrainPath()
    if (fs.existsSync(brainPath)) {
      const data = fs.readFileSync(brainPath, "utf-8")
      return JSON.parse(data)
    }
  } catch {}
  return {
    files: {},
    projects: {},
    sessions: [],
    concepts: {},
    lastUpdated: Date.now(),
  }
}

export function saveBrain(data: BrainData): void {
  try {
    const brainPath = getBrainPath()
    data.lastUpdated = Date.now()
    fs.writeFileSync(brainPath, JSON.stringify(data, null, 2), "utf-8")
  } catch {}
}

export function trackFile(brain: BrainData, filePath: string, sessionId: string): BrainData {
  const normalizedPath = filePath.replace(/\\/g, "/")
  const existing = brain.files[normalizedPath]

  if (existing) {
    existing.sessionCount++
    existing.totalEdits++
    existing.lastSession = sessionId
    existing.lastSeen = Date.now()
  } else {
    brain.files[normalizedPath] = {
      path: normalizedPath,
      lastSession: sessionId,
      sessionCount: 1,
      totalEdits: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    }
  }

  return brain
}

export function trackProject(brain: BrainData, projectPath: string, sessionId: string): BrainData {
  const projectName = path.basename(projectPath)
  const existing = brain.projects[projectName]

  if (existing) {
    if (!existing.sessions.includes(sessionId)) {
      existing.sessions.push(sessionId)
    }
    existing.lastActive = Date.now()
    existing.totalSessions++
  } else {
    brain.projects[projectName] = {
      name: projectName,
      rootPath: projectPath,
      files: [],
      sessions: [sessionId],
      lastActive: Date.now(),
      totalSessions: 1,
    }
  }

  return brain
}

export function trackSession(
  brain: BrainData,
  session: {
    id: string
    title: string
    files: string[]
    summary?: string
    tokens?: number
    project?: string
  }
): BrainData {
  const existingIndex = brain.sessions.findIndex((s) => s.id === session.id)

  const sessionData: BrainSession = {
    id: session.id,
    title: session.title,
    timestamp: Date.now(),
    files: session.files,
    summary: session.summary || "",
    tokens: session.tokens || 0,
    project: session.project,
  }

  if (existingIndex >= 0) {
    brain.sessions[existingIndex] = sessionData
  } else {
    brain.sessions.push(sessionData)
  }

  // Keep only last 500 sessions
  if (brain.sessions.length > 500) {
    brain.sessions = brain.sessions.slice(-500)
  }

  return brain
}

export function detectProject(filePath: string): string | null {
  const dir = path.dirname(filePath)
  const markers = ["package.json", "Cargo.toml", "go.mod", "pyproject.toml", ".git", "octocode.json"]

  for (let i = 0; i < 10; i++) {
    const checkPath = path.join(dir, ...Array(i).fill(".."), "package.json")
    for (const marker of markers) {
      const markerPath = path.join(dir, ...Array(i).fill(".."), marker)
      if (fs.existsSync(markerPath)) {
        return path.dirname(markerPath)
      }
    }
  }
  return null
}

export function mergeRelatedSessions(brain: BrainData): BrainData {
  const fileSessionMap = new Map<string, Set<string>>()

  // Build file -> sessions mapping
  for (const session of brain.sessions) {
    for (const file of session.files) {
      const normalized = file.replace(/\\/g, "/")
      if (!fileSessionMap.has(normalized)) {
        fileSessionMap.set(normalized, new Set())
      }
      fileSessionMap.get(normalized)!.add(session.id)
    }
  }

  // Find files with multiple sessions (related work)
  for (const [filePath, sessions] of fileSessionMap) {
    if (sessions.size > 1) {
      const file = brain.files[filePath]
      if (file) {
        file.sessionCount = sessions.size
      }
    }
  }

  return brain
}

export function getConceptsFromFiles(files: string[]): string[] {
  const concepts = new Set<string>()

  for (const file of files) {
    const basename = path.basename(file)
    const ext = path.extname(basename)
    const name = basename.replace(ext, "")

    // Extract meaningful concepts from filenames
    if (name.match(/^[A-Z][a-zA-Z]+$/)) {
      concepts.add(name)
    }
    if (file.includes("/components/")) {
      concepts.add("UI Components")
    }
    if (file.includes("/utils/")) {
      concepts.add("Utilities")
    }
    if (file.includes("/api/")) {
      concepts.add("API Layer")
    }
    if (file.includes("/test/") || file.includes(".test.")) {
      concepts.add("Testing")
    }
  }

  return Array.from(concepts)
}

export function buildBrainGraph(brain: BrainData): {
  nodes: Array<{ id: string; label: string; type: string; size: number }>
  edges: Array<{ source: string; target: string; weight: number }>
} {
  const nodes: Array<{ id: string; label: string; type: string; size: number }> = []
  const edges: Array<{ source: string; target: string; weight: number }> = []

  // Add project nodes
  for (const [name, project] of Object.entries(brain.projects)) {
    nodes.push({
      id: `project-${name}`,
      label: name,
      type: "project",
      size: project.totalSessions,
    })
  }

  // Add file nodes (only frequently used ones)
  for (const [filePath, file] of Object.entries(brain.files)) {
    if (file.sessionCount >= 2) {
      const basename = filePath.split("/").pop() || filePath
      nodes.push({
        id: `file-${filePath}`,
        label: basename,
        type: "file",
        size: file.sessionCount,
      })
    }
  }

  // Add session nodes (recent ones)
  const recentSessions = brain.sessions.slice(-20)
  for (const session of recentSessions) {
    nodes.push({
      id: `session-${session.id}`,
      label: session.title.slice(0, 30),
      type: "session",
      size: Math.max(1, Math.floor(session.tokens / 10000)),
    })
  }

  // Add concept nodes
  for (const [name, concept] of Object.entries(brain.concepts)) {
    nodes.push({
      id: `concept-${name}`,
      label: name,
      type: "concept",
      size: concept.mentionCount,
    })
  }

  // Add edges: files -> projects
  for (const [filePath, file] of Object.entries(brain.files)) {
    const project = detectProject(filePath)
    if (project) {
      const projectName = path.basename(project)
      edges.push({
        source: `file-${filePath}`,
        target: `project-${projectName}`,
        weight: file.sessionCount,
      })
    }
  }

  // Add edges: sessions -> files
  for (const session of recentSessions) {
    for (const file of session.files.slice(0, 5)) {
      edges.push({
        source: `session-${session.id}`,
        target: `file-${file}`,
        weight: 1,
      })
    }
  }

  return { nodes, edges }
}

// Real-time sync queue
let syncQueue: BrainSyncQueue = { pending: [], lastSync: 0 }
const SYNC_INTERVAL = 5000 // 5 seconds

function loadSyncQueue(): BrainSyncQueue {
  try {
    const queuePath = path.join(BRAIN_DIR, "sync-queue.json")
    if (fs.existsSync(queuePath)) {
      return JSON.parse(fs.readFileSync(queuePath, "utf-8"))
    }
  } catch {}
  return { pending: [], lastSync: 0 }
}

function saveSyncQueue(queue: BrainSyncQueue): void {
  try {
    const queuePath = path.join(BRAIN_DIR, "sync-queue.json")
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), "utf-8")
  } catch {}
}

export function queueSync(type: string, data: unknown): void {
  syncQueue = loadSyncQueue()
  syncQueue.pending.push({ type, data, timestamp: Date.now() })
  saveSyncQueue(syncQueue)
}

export function processSyncQueue(): BrainSyncQueue {
  syncQueue = loadSyncQueue()
  const now = Date.now()

  // Process pending items
  for (const item of syncQueue.pending) {
    try {
      if (item.type === "session") {
        const sessionData = item.data as BrainSession
        const brain = loadBrain()
        trackSession(brain, {
          id: sessionData.id,
          title: sessionData.title,
          files: sessionData.files,
          summary: sessionData.summary,
          tokens: sessionData.tokens,
          project: sessionData.project,
        })
        saveBrain(brain)
      } else if (item.type === "file") {
        const fileData = item.data as { path: string; sessionId: string }
        const brain = loadBrain()
        trackFile(brain, fileData.path, fileData.sessionId)
        saveBrain(brain)
      } else if (item.type === "project") {
        const projectData = item.data as { path: string; sessionId: string }
        const brain = loadBrain()
        trackProject(brain, projectData.path, projectData.sessionId)
        saveBrain(brain)
      }
    } catch {}
  }

  // Clear processed items
  syncQueue.pending = []
  syncQueue.lastSync = now
  saveSyncQueue(syncQueue)

  return syncQueue
}

// Obsidian vault sync
export function syncToObsidianVault(vaultPath: string): void {
  try {
    const brain = loadBrain()

    // Ensure sync directory exists
    if (!fs.existsSync(OBSIDIAN_SYNC_DIR)) {
      fs.mkdirSync(OBSIDIAN_SYNC_DIR, { recursive: true })
    }

    // Create/update brain summary note
    const summaryContent = `---
created: ${new Date(brain.lastUpdated).toISOString()}
type: brain-summary
---

# Brain Map Summary

## Projects (${Object.keys(brain.projects).length})
${Object.values(brain.projects).map((p) => `- **${p.name}**: ${p.totalSessions} sessions, ${p.files.length} files`).join("\n")}

## Recent Sessions (${brain.sessions.length})
${brain.sessions.slice(-10).map((s) => `- **${s.title}** (${new Date(s.timestamp).toLocaleDateString()}): ${s.files.length} files`).join("\n")}

## Frequent Files (${Object.keys(brain.files).length})
${Object.values(brain.files)
  .filter((f) => f.sessionCount >= 2)
  .sort((a, b) => b.sessionCount - a.sessionCount)
  .slice(0, 20)
  .map((f) => `- **${f.path.split("/").pop()}**: ${f.sessionCount} sessions`)
  .join("\n")}

## Concepts (${Object.keys(brain.concepts).length})
${Object.values(brain.concepts)
  .map((c) => `- **${c.name}**: ${c.mentionCount} mentions`)
  .join("\n")}

---
Last synced: ${new Date().toISOString()}
`
    fs.writeFileSync(path.join(OBSIDIAN_SYNC_DIR, "Brain Summary.md"), summaryContent, "utf-8")

    // Create project notes
    for (const [name, project] of Object.entries(brain.projects)) {
      const projectNote = `---
created: ${new Date(project.lastActive).toISOString()}
type: project
project: ${name}
---

# ${name}

## Stats
- Total Sessions: ${project.totalSessions}
- Files: ${project.files.length}
- Last Active: ${new Date(project.lastActive).toLocaleDateString()}

## Files
${project.files.map((f) => `- ${f}`).join("\n")}

## Sessions
${project.sessions.slice(-10).map((s) => {
  const session = brain.sessions.find((sess) => sess.id === s)
  return session ? `- **${session.title}** (${new Date(session.timestamp).toLocaleDateString()})` : `- ${s}`
}).join("\n")}
`
      fs.writeFileSync(path.join(OBSIDIAN_SYNC_DIR, `${name}.md`), projectNote, "utf-8")
    }

    // Create session index note
    const sessionIndex = `---
created: ${new Date().toISOString()}
type: session-index
---

# Session Index

${brain.sessions.slice(-50).map((s) => {
  const date = new Date(s.timestamp).toLocaleDateString()
  const files = s.files.length > 0 ? ` (${s.files.length} files)` : ""
  return `- [[${s.id}]] - ${s.title} (${date})${files}`
}).join("\n")}
`
    fs.writeFileSync(path.join(OBSIDIAN_SYNC_DIR, "Session Index.md"), sessionIndex, "utf-8")

  } catch {}
}

// Auto-detect and sync on file changes
export function watchForChanges(callback: (changes: string[]) => void): void {
  const brainPath = getBrainPath()

  try {
    fs.watch(brainPath, { persistent: false }, (eventType, filename) => {
      if (filename) {
        callback([filename])
      }
    })
  } catch {}
}

// Get brain stats for display
export function getBrainStats(brain: BrainData): {
  totalSessions: number
  totalFiles: number
  totalProjects: number
  totalConcepts: number
  lastUpdated: string
  topFiles: Array<{ name: string; count: number }>
  topProjects: Array<{ name: string; sessions: number }>
} {
  const topFiles = Object.values(brain.files)
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 10)
    .map((f) => ({ name: f.path.split("/").pop() || f.path, count: f.sessionCount }))

  const topProjects = Object.values(brain.projects)
    .sort((a, b) => b.totalSessions - a.totalSessions)
    .slice(0, 5)
    .map((p) => ({ name: p.name, sessions: p.totalSessions }))

  return {
    totalSessions: brain.sessions.length,
    totalFiles: Object.keys(brain.files).length,
    totalProjects: Object.keys(brain.projects).length,
    totalConcepts: Object.keys(brain.concepts).length,
    lastUpdated: new Date(brain.lastUpdated).toISOString(),
    topFiles,
    topProjects,
  }
}
