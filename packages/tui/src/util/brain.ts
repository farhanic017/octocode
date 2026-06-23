/*
 * OctoCode - Original UI/UX Design
 * Copyright (C) 2025 Farhan Dhrubo
 * Licensed under the GNU General Public License v3.0
 * https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as fs from "fs"
import * as path from "path"
import * as os from "os"

function getBrainDir(): string {
  const base = process.platform === "win32"
    ? path.join(os.homedir(), "AppData", "Local", "octo")
    : path.join(os.homedir(), ".local", "share", "octo")
  return path.join(base, "brain")
}

const BRAIN_DIR = getBrainDir()
const OBSIDIAN_SYNC_DIR = path.join(getBrainDir(), "obsidian")

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

  // Add all file nodes
  for (const [filePath, file] of Object.entries(brain.files)) {
    const basename = filePath.split("/").pop() || filePath
    nodes.push({
      id: `file-${filePath}`,
      label: basename,
      type: "file",
      size: file.sessionCount,
    })
  }

  // Add ALL session nodes
  for (const session of brain.sessions) {
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
  for (const session of brain.sessions) {
    for (const file of session.files.slice(0, 5)) {
      edges.push({
        source: `session-${session.id}`,
        target: `file-${file}`,
        weight: 1,
      })
    }
  }

  // Add edges: sessions that share files are connected
  const sessionFileMap = new Map<string, string[]>()
  for (const session of brain.sessions) {
    sessionFileMap.set(session.id, session.files)
  }
  // Limit O(n^2) to recent sessions for performance
  const recentForEdges = brain.sessions.slice(-30)
  for (let i = 0; i < recentForEdges.length; i++) {
    for (let j = i + 1; j < recentForEdges.length; j++) {
      const filesA = sessionFileMap.get(recentForEdges[i].id) || []
      const filesB = sessionFileMap.get(recentForEdges[j].id) || []
      const shared = filesA.filter((f) => filesB.includes(f))
      if (shared.length > 0) {
        edges.push({
          source: `session-${recentForEdges[i].id}`,
          target: `session-${recentForEdges[j].id}`,
          weight: shared.length,
        })
      }
    }
  }

  // Add edges: sessions in same project are connected
  const projectSessions = new Map<string, string[]>()
  for (const session of brain.sessions) {
    if (session.project) {
      const existing = projectSessions.get(session.project) || []
      existing.push(session.id)
      projectSessions.set(session.project, existing)
    }
  }
  for (const [, sessionIds] of projectSessions) {
    // Connect each session to the first one (hub pattern)
    if (sessionIds.length > 1) {
      for (let i = 1; i < sessionIds.length; i++) {
        edges.push({
          source: `session-${sessionIds[0]}`,
          target: `session-${sessionIds[i]}`,
          weight: 1,
        })
      }
    }
  }

  // Add edges: concepts -> files/sessions that mention them
  for (const [name, concept] of Object.entries(brain.concepts)) {
    for (const fileId of concept.relatedFiles.slice(0, 3)) {
      const fileEntry = brain.files[fileId]
      if (fileEntry) {
        edges.push({
          source: `concept-${name}`,
          target: `file-${fileId}`,
          weight: 1,
        })
      }
    }
    for (const sessionId of concept.sessions.slice(0, 3)) {
      edges.push({
        source: `concept-${name}`,
        target: `session-${sessionId}`,
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

// Generate session .md file content for Obsidian vault
export function generateSessionMarkdown(session: BrainSession, brain: BrainData): string {
  const date = new Date(session.timestamp)
  const formattedDate = date.toISOString().split("T")[0]
  const formattedTime = date.toLocaleTimeString()

  const filesList = session.files.length > 0
    ? session.files.map((f) => `- \`${f}\``).join("\n")
    : "- No files modified"

  const projectInfo = session.project
    ? brain.projects[session.project]
    : null

  const relatedSessions = brain.sessions
    .filter((s) => s.id !== session.id && s.files.some((f) => session.files.includes(f)))
    .slice(0, 5)

  const relatedList = relatedSessions.length > 0
    ? relatedSessions.map((s) => `- [[${s.id}|${s.title}]]`).join("\n")
    : "- No related sessions"

  return `---
created: ${date.toISOString()}
type: session
session_id: ${session.id}
project: ${session.project || "unknown"}
tokens: ${session.tokens}
files_modified: ${session.files.length}
---

# ${session.title}

**Date:** ${formattedDate} at ${formattedTime}
**Project:** ${session.project || "Unknown"}
**Tokens Used:** ${session.tokens.toLocaleString()}

## Summary

${session.summary || "No summary available"}

## Files Modified

${filesList}

## Project Context

${projectInfo ? `
- **Total Sessions:** ${projectInfo.totalSessions}
- **Last Active:** ${new Date(projectInfo.lastActive).toLocaleDateString()}
- **Total Files:** ${projectInfo.files.length}
` : "- No project context available"}

## Related Sessions

${relatedList}

---
*Auto-generated by OctoCode Brain Map*
*Last updated: ${new Date().toISOString()}*
`
}

// Sync session to Obsidian vault as .md file
export function syncSessionToVault(session: BrainSession, vaultPath: string): void {
  try {
    const sessionsDir = path.join(vaultPath, "OctoCode", "Sessions")
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true })
    }

    const brain = loadBrain()
    const content = generateSessionMarkdown(session, brain)
    const filename = `${session.id}.md`
    fs.writeFileSync(path.join(sessionsDir, filename), content, "utf-8")
  } catch {}
}

// Sync session to any subfolder (auto-creates OctoCode folder if missing)
export function syncSessionToFolder(session: BrainSession, folderPath: string): void {
  try {
    const octoDir = path.join(folderPath, "OctoCode")
    const sessionsDir = path.join(octoDir, "Sessions")
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true })
    }

    const brain = loadBrain()
    const content = generateSessionMarkdown(session, brain)
    const filename = `${session.id}.md`
    fs.writeFileSync(path.join(sessionsDir, filename), content, "utf-8")
  } catch {}
}

// Read all subfolders in a vault and return their paths
export function getVaultSubfolders(vaultPath: string): string[] {
  try {
    if (!fs.existsSync(vaultPath)) return []
    const entries = fs.readdirSync(vaultPath, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => path.join(vaultPath, e.name))
  } catch {}
  return []
}

// Read folder contents (files and subfolders) for agent understanding
export function readFolderContents(folderPath: string): { name: string; type: "file" | "folder"; path: string }[] {
  try {
    if (!fs.existsSync(folderPath)) return []
    const entries = fs.readdirSync(folderPath, { withFileTypes: true })
    return entries
      .filter((e) => !e.name.startsWith("."))
      .map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "folder" as const : "file" as const,
        path: path.join(folderPath, e.name),
      }))
  } catch {}
  return []
}

// Auto-create OctoCode folder structure in any directory
export function ensureOctoFolder(dirPath: string): void {
  const octoDir = path.join(dirPath, "OctoCode")
  const sessionsDir = path.join(octoDir, "Sessions")
  const notesDir = path.join(octoDir, "Notes")
  if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true })
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true })
}

// Update session .md file with new context
export function updateSessionInVault(sessionId: string, vaultPath: string): void {
  try {
    const brain = loadBrain()
    const session = brain.sessions.find((s) => s.id === sessionId)
    if (!session) return

    syncSessionToVault(session, vaultPath)
  } catch {}
}

// Auto-document a session silently in background (only if Obsidian configured)
export function autoDocumentSession(session: BrainSession, vaultPath?: string): boolean {
  try {
    const configPath = process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Local", "octo", "obsidian-config.json")
      : path.join(os.homedir(), ".local", "share", "octo", "obsidian-config.json")

    if (!fs.existsSync(configPath)) return false

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
    if (!config.connected || !config.vaultPath) return false

    const targetVault = vaultPath || config.vaultPath

    // Sync to vault root
    syncSessionToVault(session, targetVault)

    // Sync to all subfolders with OctoCode
    const subfolders = getVaultSubfolders(targetVault)
    for (const sub of subfolders) {
      const subContents = readFolderContents(sub)
      if (subContents.some((f) => f.name === "OctoCode")) {
        syncSessionToFolder(session, sub)
      }
    }

    // Sync to user-specified subfolders
    for (const subfolder of config.subfolders || []) {
      const subPath = path.join(targetVault, subfolder)
      if (fs.existsSync(subPath)) {
        ensureOctoFolder(subPath)
        syncSessionToFolder(session, subPath)
      }
    }

    return true
  } catch {
    return false
  }
}

// Build vault tree structure for agent context
export interface VaultTreeNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: VaultTreeNode[]
  hasOctoCode?: boolean
}

export function buildVaultTree(vaultPath: string, maxDepth: number = 3, currentDepth: number = 0): VaultTreeNode[] {
  if (currentDepth >= maxDepth) return []
  try {
    if (!fs.existsSync(vaultPath)) return []
    const entries = fs.readdirSync(vaultPath, { withFileTypes: true })
    return entries
      .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules")
      .map((e) => {
        const fullPath = path.join(vaultPath, e.name)
        if (e.isDirectory()) {
          const children = buildVaultTree(fullPath, maxDepth, currentDepth + 1)
          const hasOcto = children.some((c) => c.name === "OctoCode") || fs.existsSync(path.join(fullPath, "OctoCode"))
          return {
            name: e.name,
            path: fullPath,
            type: "folder" as const,
            children,
            hasOctoCode: hasOcto,
          }
        }
        return {
          name: e.name,
          path: fullPath,
          type: "file" as const,
        }
      })
  } catch {
    return []
  }
}

// Flatten vault tree to readable context string for agent
export function vaultTreeToContext(tree: VaultTreeNode[], indent: number = 0): string {
  const lines: string[] = []
  for (const node of tree) {
    const prefix = "  ".repeat(indent)
    const icon = node.type === "folder" ? (node.hasOctoCode ? "📁 *" : "📁") : "📄"
    lines.push(`${prefix}${icon} ${node.name}`)
    if (node.children) {
      lines.push(vaultTreeToContext(node.children, indent + 1))
    }
  }
  return lines.join("\n")
}

// Get all connections for a session (other sessions sharing files, same project)
export function getSessionConnections(sessionId: string): { sessionId: string; reason: string }[] {
  const brain = loadBrain()
  const session = brain.sessions.find((s) => s.id === sessionId)
  if (!session) return []

  const connections: { sessionId: string; reason: string }[] = []

  // Sessions sharing files
  for (const other of brain.sessions) {
    if (other.id === session.id) continue
    const sharedFiles = other.files.filter((f) => session.files.includes(f))
    if (sharedFiles.length > 0) {
      connections.push({
        sessionId: other.id,
        reason: `${sharedFiles.length} shared files`,
      })
    }
  }

  // Same project
  if (session.project) {
    for (const other of brain.sessions) {
      if (other.id === session.id) continue
      if (other.project === session.project) {
        connections.push({
          sessionId: other.id,
          reason: `same project: ${session.project}`,
        })
      }
    }
  }

  return connections
}

// Build a structured summary document for a session
// Written in clear prompt language so any model/agent can understand it
export function buildSessionSummary(session: BrainSession, brain: BrainData): string {
  const created = new Date(session.timestamp)
  const filesList = session.files.length > 0
    ? session.files.map((f) => {
        const basename = f.split("/").pop() || f.split("\\").pop() || f
        return basename
      })
    : []

  const projectInfo = session.project ? brain.projects[session.project] : null

  const relatedSessions = brain.sessions
    .filter((s) => s.id !== session.id && s.files.some((f) => session.files.includes(f)))
    .slice(0, 5)

  let doc = `# ${session.title}\n\n`
  doc += `> **Session:** \`${session.id}\` · **Date:** ${created.toLocaleDateString()} at ${created.toLocaleTimeString()}\n\n`

  // What was requested — written as structured task description
  doc += `## Task Description\n\n`
  doc += `The following task was assigned to the AI agent:\n\n`
  if (session.summary) {
    // Rewrite summary as a clear task prompt
    doc += `\`\`\`\n${session.summary}\n\`\`\`\n\n`
  } else if (filesList.length > 0) {
    doc += `Perform development work involving the following files: ${filesList.join(", ")}\n\n`
  } else {
    doc += `Execute general development tasks as requested by the user.\n\n`
  }

  // What was done — structured as completed actions
  doc += `## Completed Actions\n\n`
  if (filesList.length > 0) {
    doc += `The agent performed the following actions:\n\n`
    for (let i = 0; i < filesList.length; i++) {
      doc += `${i + 1}. Modified file: \`${filesList[i]}\`\n`
    }
    doc += `\n`
    doc += `**Action summary:** ${filesList.length} file(s) were created or modified.\n`
    doc += `**Token usage:** ${session.tokens.toLocaleString()} tokens consumed.\n`
    if (projectInfo) {
      doc += `**Project context:** ${session.project} (${projectInfo.totalSessions} total sessions in project).\n`
    }
    doc += `\n`
  } else {
    doc += `No file modifications were recorded in this session.\n\n`
  }

  // How it was done — technical approach
  doc += `## Technical Approach\n\n`
  if (filesList.length > 0) {
    doc += `The agent operated within the following project structure:\n\n`
    doc += `- **Working directory:** ${session.project || "Unknown"}\n`
    doc += `- **Files accessed:**\n`
    for (const f of filesList) {
      doc += `  - \`${f}\`\n`
    }
    doc += `\n`
  } else {
    doc += `The agent performed non-file operations (analysis, research, or conversation).\n\n`
  }

  // What went wrong (from summary if it contains error info)
  if (session.summary && (session.summary.toLowerCase().includes("error") || session.summary.toLowerCase().includes("fix"))) {
    doc += `## Issues & Resolutions\n\n`
    doc += `${session.summary}\n\n`
  }

  // Related sessions
  if (relatedSessions.length > 0) {
    doc += `## Related Sessions\n\n`
    for (const rel of relatedSessions) {
      doc += `- **${rel.title}** (\`${rel.id.slice(0, 8)}\`) — shared files: ${rel.files.filter((f) => session.files.includes(f)).join(", ")}\n`
    }
    doc += `\n`
  }

  // Project context
  if (projectInfo) {
    doc += `## Project Context\n\n`
    doc += `- **Total Sessions:** ${projectInfo.totalSessions}\n`
    doc += `- **Last Active:** ${new Date(projectInfo.lastActive).toLocaleDateString()}\n`
    doc += `- **Total Files:** ${projectInfo.files.length}\n`
    doc += `\n`
  }

  doc += `---\n`
  doc += `*Auto-documented by OctoCode · ${new Date().toLocaleString()}*\n`

  return doc
}

// Read session note from vault (any folder with OctoCode/Sessions)
export function readSessionNote(sessionId: string, vaultPath: string): string | null {
  try {
    const notePath = path.join(vaultPath, "OctoCode", "Sessions", `${sessionId}.md`)
    if (fs.existsSync(notePath)) {
      return fs.readFileSync(notePath, "utf-8")
    }
  } catch {}
  return null
}

// Read session note from any subfolder
export function readSessionNoteFromFolder(sessionId: string, folderPath: string): string | null {
  try {
    const notePath = path.join(folderPath, "OctoCode", "Sessions", `${sessionId}.md`)
    if (fs.existsSync(notePath)) {
      return fs.readFileSync(notePath, "utf-8")
    }
  } catch {}
  return null
}

// Write/edit session note in vault
export function writeSessionNote(sessionId: string, vaultPath: string, content: string): boolean {
  try {
    const sessionsDir = path.join(vaultPath, "OctoCode", "Sessions")
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true })
    }
    fs.writeFileSync(path.join(sessionsDir, `${sessionId}.md`), content, "utf-8")
    return true
  } catch {}
  return false
}

// Search all vault folders for a session note
export function findSessionNote(sessionId: string, vaultPath: string, subfolders: string[] = []): { content: string; folder: string } | null {
  // Check vault root first
  const rootNote = readSessionNote(sessionId, vaultPath)
  if (rootNote) return { content: rootNote, folder: vaultPath }

  // Check subfolders
  for (const sub of subfolders) {
    const subPath = path.join(vaultPath, sub)
    const note = readSessionNoteFromFolder(sessionId, subPath)
    if (note) return { content: note, folder: subPath }
  }

  // Scan all directories for OctoCode folders
  try {
    if (fs.existsSync(vaultPath)) {
      const entries = fs.readdirSync(vaultPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          const note = readSessionNoteFromFolder(sessionId, path.join(vaultPath, entry.name))
          if (note) return { content: note, folder: path.join(vaultPath, entry.name) }
        }
      }
    }
  } catch {}

  return null
}

// Generate a dynamic session title from conversation content
// Extracts the core topic from user messages — safe, no crash possible
export function generateSessionTitle(userMessages: string[]): string {
  if (!userMessages || userMessages.length === 0) return "Untitled Session"

  // Take the first meaningful user message
  const firstMsg = userMessages.find((m) => m.trim().length > 5) || userMessages[0]
  if (!firstMsg) return "Untitled Session"

  // Clean up: take first line, strip markdown/code, cap length
  let title = firstMsg
    .split("\n")[0]
    .replace(/^[/`#>*\-]+/, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1)
  }

  if (title.length > 60) {
    title = title.slice(0, 57).replace(/\s+\S*$/, "") + "..."
  }

  return title || "Untitled Session"
}

// Read the "## Completed Actions" section from an existing note
export function extractExistingSections(content: string): { whatWasDone: string; timestamp: string } {
  const result = { whatWasDone: "", timestamp: "" }
  try {
    const tsMatch = content.match(/\*Documented by OctoCode · (.+?)\*/)
    if (tsMatch) result.timestamp = tsMatch[1]
    const actionsMatch = content.match(/## Completed Actions\n\n([\s\S]*?)(?=\n## |\n---|\Z)/)
    if (actionsMatch) result.whatWasDone = actionsMatch[1].trim()
  } catch {}
  return result
}

// Check if a session note already exists in the vault
export function sessionNoteExists(sessionId: string, vaultPath: string): boolean {
  try {
    const notePath = path.join(vaultPath, "OctoCode", "Sessions", `${sessionId}.md`)
    return fs.existsSync(notePath)
  } catch {}
  return false
}

// Find which folder a session note lives in
export function findSessionNoteFolder(sessionId: string, vaultPath: string, subfolders: string[] = []): string | null {
  try {
    const rootPath = path.join(vaultPath, "OctoCode", "Sessions", `${sessionId}.md`)
    if (fs.existsSync(rootPath)) return vaultPath
  } catch {}

  for (const sub of subfolders) {
    try {
      const subPath = path.join(vaultPath, sub, "OctoCode", "Sessions", `${sessionId}.md`)
      if (fs.existsSync(subPath)) return path.join(vaultPath, sub)
    } catch {}
  }

  return null
}

// Append new actions to an existing session note (idempotent)
export function appendToSessionNote(sessionId: string, folderPath: string, newActions: string, newFiles: string[]): boolean {
  try {
    const notePath = path.join(folderPath, "OctoCode", "Sessions", `${sessionId}.md`)
    if (!fs.existsSync(notePath)) return false

    let content = fs.readFileSync(notePath, "utf-8")

    // Remove old footer
    content = content.replace(/\n---\n\*Documented by OctoCode[^\n]*\*\n?$/, "")

    // Find the Completed Actions section and append
    if (content.includes("## Completed Actions")) {
      const insertPoint = content.indexOf("## Files Modified")
      if (insertPoint > -1) {
        const before = content.slice(0, insertPoint)
        const after = content.slice(insertPoint)
        content = before + newActions + "\n" + after
      } else {
        content = content.trimEnd() + "\n" + newActions + "\n"
      }
    }

    // Update footer timestamp
    content = content.trimEnd() + "\n\n---\n*Documented by OctoCode · " + new Date().toLocaleString() + "*\n"

    fs.writeFileSync(notePath, content, "utf-8")
    return true
  } catch {}
  return false
}
