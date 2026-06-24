// Simple Persistent Memory
//
// Stores memories in MEMORY.md files per project.
// No complex dependencies - just file I/O.
import path from "path"
import * as fs from "fs/promises"
import { Global } from "@octocode-ai/core/global"

const MEMORY_FILE = "MEMORY.md"
const CHECKPOINT_DIR = "checkpoints"

export interface MemoryEntry {
  content: string
  timestamp: number
  tags: string[]
}

export interface Checkpoint {
  id: string
  sessionID: string
  timestamp: number
  summary: string
  context: string
}

function getMemoryDir(projectID: string): string {
  return path.join(Global.Path.data, "memory", projectID)
}

function getMemoryFile(projectID: string): string {
  return path.join(getMemoryDir(projectID), MEMORY_FILE)
}

function getCheckpointDir(projectID: string): string {
  return path.join(getMemoryDir(projectID), CHECKPOINT_DIR)
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {}
}

export async function readMemory(projectID: string): Promise<string> {
  try {
    return await fs.readFile(getMemoryFile(projectID), "utf-8")
  } catch {
    return ""
  }
}

export async function writeMemory(projectID: string, content: string): Promise<void> {
  const file = getMemoryFile(projectID)
  await ensureDir(path.dirname(file))
  await fs.writeFile(file, content, "utf-8")
}

export async function appendMemory(
  projectID: string,
  entry: Omit<MemoryEntry, "timestamp">,
): Promise<void> {
  const existing = await readMemory(projectID)
  const timestamp = Date.now()
  const header = "# Long-term Memory\n\n"
  const newEntry = `## ${new Date(timestamp).toISOString()}\n\n${entry.content}\n\nTags: ${entry.tags.join(", ")}\n\n---\n\n`

  const content = existing.startsWith("# Long-term Memory") ? existing + newEntry : header + newEntry
  await writeMemory(projectID, content)
}

export async function createCheckpoint(
  projectID: string,
  checkpoint: Omit<Checkpoint, "id" | "timestamp">,
): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const timestamp = Date.now()
  const full: Checkpoint = { ...checkpoint, id, timestamp }

  const dir = getCheckpointDir(projectID)
  await ensureDir(dir)
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(full, null, 2), "utf-8")
  return id
}

export async function getRecentCheckpoints(projectID: string, limit = 5): Promise<Checkpoint[]> {
  const dir = getCheckpointDir(projectID)
  try {
    const files = await fs.readdir(dir)
    const jsonFiles = files.filter((f) => f.endsWith(".json")).slice(0, limit)
    const checkpoints: Checkpoint[] = []
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(dir, file), "utf-8")
        checkpoints.push(JSON.parse(content))
      } catch {}
    }
    return checkpoints.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

export async function searchMemory(projectID: string, query: string): Promise<MemoryEntry[]> {
  const content = await readMemory(projectID)
  if (!content) return []

  const entries: MemoryEntry[] = []
  const sections = content.split("---").filter((s) => s.trim())

  for (const section of sections) {
    if (section.toLowerCase().includes(query.toLowerCase())) {
      const lines = section.trim().split("\n")
      const timestampMatch = lines[0]?.match(/^## (.+)$/)
      const timestamp = timestampMatch ? new Date(timestampMatch[1]).getTime() : 0
      const tagsMatch = section.match(/Tags: (.+)$/)
      const tags = tagsMatch ? tagsMatch[1].split(", ").map((t) => t.trim()) : []
      const content = lines
        .filter((l) => !l.startsWith("## ") && !l.startsWith("Tags: "))
        .join("\n")
        .trim()
      entries.push({ content, timestamp, tags })
    }
  }

  return entries
}

export async function injectMemoryContext(projectID: string): Promise<string> {
  const sections: string[] = []

  const memory = await readMemory(projectID)
  if (memory) {
    sections.push(`# Persistent Memory\n\n${memory}`)
  }

  const checkpoints = await getRecentCheckpoints(projectID, 3)
  if (checkpoints.length > 0) {
    const checkpointSection = checkpoints
      .map(
        (cp) =>
          `## Checkpoint ${new Date(cp.timestamp).toISOString()}\n\n${cp.summary}\n\nContext: ${cp.context}`,
      )
      .join("\n\n---\n\n")
    sections.push(`# Recent Checkpoints\n\n${checkpointSection}`)
  }

  return sections.join("\n\n---\n\n")
}

// User style preferences - persisted across sessions
export interface StylePreferences {
  tone?: "formal" | "casual" | "technical" | "friendly"
  verbosity?: "minimal" | "moderate" | "detailed"
  codeStyle?: "concise" | "readable" | "documented"
  responseFormat?: "short" | "long" | "auto"
  favoriteLanguages?: string[]
  customInstructions?: string[]
}

const STYLE_FILE = "STYLE.json"

function getStyleFile(projectID: string): string {
  return path.join(getMemoryDir(projectID), STYLE_FILE)
}

export async function readStylePreferences(projectID: string): Promise<StylePreferences> {
  try {
    const content = await fs.readFile(getStyleFile(projectID), "utf-8")
    return JSON.parse(content) as StylePreferences
  } catch {
    return {}
  }
}

export async function writeStylePreferences(projectID: string, prefs: StylePreferences): Promise<void> {
  const file = getStyleFile(projectID)
  await ensureDir(path.dirname(file))
  await fs.writeFile(file, JSON.stringify(prefs, null, 2), "utf-8")
}

export async function updateStylePreference(
  projectID: string,
  key: keyof StylePreferences,
  value: unknown,
): Promise<void> {
  const prefs = await readStylePreferences(projectID)
  ;(prefs as Record<string, unknown>)[key] = value
  await writeStylePreferences(projectID, prefs)
}

export async function injectStyleContext(projectID: string): Promise<string> {
  const prefs = await readStylePreferences(projectID)
  if (Object.keys(prefs).length === 0) return ""

  const lines: string[] = ["# User Style Preferences"]
  if (prefs.tone) lines.push(`- Tone: ${prefs.tone}`)
  if (prefs.verbosity) lines.push(`- Verbosity: ${prefs.verbosity}`)
  if (prefs.codeStyle) lines.push(`- Code style: ${prefs.codeStyle}`)
  if (prefs.responseFormat) lines.push(`- Response format: ${prefs.responseFormat}`)
  if (prefs.favoriteLanguages?.length) lines.push(`- Languages: ${prefs.favoriteLanguages.join(", ")}`)
  if (prefs.customInstructions?.length) {
    lines.push("- Custom instructions:")
    prefs.customInstructions.forEach((inst) => lines.push(`  - ${inst}`))
  }

  return lines.join("\n")
}
