import { execSync, spawn } from "child_process"
import path from "path"
import fs from "fs"
import os from "os"

const CHECKPOINT_DIR = path.join(os.homedir(), ".octocode", "checkpoints")

export interface Checkpoint {
  id: string
  timestamp: number
  sessionId: string
  description: string
  files: string[]
  gitCommit?: string
}

function ensureDir() {
  if (!fs.existsSync(CHECKPOINT_DIR)) {
    fs.mkdirSync(CHECKPOINT_DIR, { recursive: true })
  }
}

function getCheckpointPath(id: string): string {
  return path.join(CHECKPOINT_DIR, `${id}.json`)
}

export async function createCheckpoint(
  sessionId: string,
  description: string,
  workingDir: string,
  files?: string[],
): Promise<Checkpoint> {
  ensureDir()
  const id = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const checkpointFiles = files || getModifiedFiles(workingDir)

  let gitCommit: string | undefined
  try {
    gitCommit = execSync("git rev-parse HEAD", { cwd: workingDir, encoding: "utf8" }).trim()
  } catch {}

  const snapshotDir = path.join(CHECKPOINT_DIR, id)
  fs.mkdirSync(snapshotDir, { recursive: true })

  for (const file of checkpointFiles) {
    const absPath = path.resolve(workingDir, file)
    if (fs.existsSync(absPath)) {
      const dest = path.join(snapshotDir, file)
      const destDir = path.dirname(dest)
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
      fs.copyFileSync(absPath, dest)
    }
  }

  const checkpoint: Checkpoint = {
    id,
    timestamp: Date.now(),
    sessionId,
    description,
    files: checkpointFiles,
    gitCommit,
  }

  fs.writeFileSync(getCheckpointPath(id), JSON.stringify(checkpoint, null, 2))
  return checkpoint
}

export async function rollback(checkpointId: string, workingDir: string): Promise<{ restored: number; errors: string[] }> {
  const cpPath = getCheckpointPath(checkpointId)
  if (!fs.existsSync(cpPath)) {
    throw new Error(`Checkpoint ${checkpointId} not found`)
  }

  const checkpoint: Checkpoint = JSON.parse(fs.readFileSync(cpPath, "utf-8"))
  const snapshotDir = path.join(CHECKPOINT_DIR, checkpoint.id)
  const errors: string[] = []
  let restored = 0

  for (const file of checkpoint.files) {
    const snapshotFile = path.join(snapshotDir, file)
    const targetFile = path.resolve(workingDir, file)

    if (!fs.existsSync(snapshotFile)) {
      errors.push(`Snapshot missing for ${file}`)
      continue
    }

    try {
      const targetDir = path.dirname(targetFile)
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
      fs.copyFileSync(snapshotFile, targetFile)
      restored++
    } catch (e: any) {
      errors.push(`Failed to restore ${file}: ${e.message}`)
    }
  }

  return { restored, errors }
}

export async function rollbackToGit(checkpointId: string, workingDir: string): Promise<boolean> {
  const cpPath = getCheckpointPath(checkpointId)
  if (!fs.existsSync(cpPath)) throw new Error(`Checkpoint ${checkpointId} not found`)

  const checkpoint: Checkpoint = JSON.parse(fs.readFileSync(cpPath, "utf-8"))
  if (!checkpoint.gitCommit) throw new Error(`No git commit recorded for checkpoint ${checkpointId}`)

  try {
    execSync(`git checkout ${checkpoint.gitCommit} -- .`, { cwd: workingDir, encoding: "utf8" })
    return true
  } catch {
    return false
  }
}

export function listCheckpoints(sessionId?: string, limit = 20): Checkpoint[] {
  ensureDir()
  const files = fs.readdirSync(CHECKPOINT_DIR).filter((f) => f.endsWith(".json"))
  let checkpoints: Checkpoint[] = []

  for (const f of files) {
    try {
      const cp: Checkpoint = JSON.parse(fs.readFileSync(path.join(CHECKPOINT_DIR, f), "utf-8"))
      if (!sessionId || cp.sessionId === sessionId) {
        checkpoints.push(cp)
      }
    } catch {}
  }

  checkpoints.sort((a, b) => b.timestamp - a.timestamp)
  return checkpoints.slice(0, limit)
}

export function getCheckpoint(id: string): Checkpoint | null {
  const cpPath = getCheckpointPath(id)
  if (!fs.existsSync(cpPath)) return null
  try {
    return JSON.parse(fs.readFileSync(cpPath, "utf-8"))
  } catch {
    return null
  }
}

export function deleteCheckpoint(id: string): boolean {
  const cpPath = getCheckpointPath(id)
  const snapshotDir = path.join(CHECKPOINT_DIR, id)
  if (fs.existsSync(cpPath)) fs.unlinkSync(cpPath)
  if (fs.existsSync(snapshotDir)) fs.rmSync(snapshotDir, { recursive: true })
  return true
}

function getModifiedFiles(workingDir: string): string[] {
  try {
    const output = execSync("git diff --name-only HEAD", { cwd: workingDir, encoding: "utf8" })
    const untracked = execSync("git ls-files --others --exclude-standard", { cwd: workingDir, encoding: "utf8" })
    const staged = execSync("git diff --name-only --cached", { cwd: workingDir, encoding: "utf8" })
    return [...new Set([...output.split("\n").filter(Boolean), ...untracked.split("\n").filter(Boolean), ...staged.split("\n").filter(Boolean)])]
  } catch {
    return []
  }
}

export async function autoCheckpoint(
  sessionId: string,
  workingDir: string,
  description: string,
): Promise<Checkpoint | null> {
  const modified = getModifiedFiles(workingDir)
  if (modified.length === 0) return null
  return createCheckpoint(sessionId, description, workingDir, modified)
}
