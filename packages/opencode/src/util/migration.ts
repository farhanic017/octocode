import fs from "fs/promises"
import path from "path"

function logInfo(msg: string, data?: any) {
  console.log(`[migration] ${msg}`, data || "")
}

function logWarn(msg: string, data?: any) {
  console.warn(`[migration] ${msg}`, data || "")
}

interface MigrationResult {
  config: boolean
  directory: boolean
  database: boolean
  projectId: boolean
}

export async function migrateIfNeeded(homeDir: string, projectDir?: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    config: false,
    directory: false,
    database: false,
    projectId: false,
  }

  // 1. Migrate config file: mimocode.json → octocode.json
  try {
    const oldConfig = path.join(projectDir || process.cwd(), "mimocode.json")
    const newConfig = path.join(projectDir || process.cwd(), "octocode.json")
    const oldConfigC = path.join(projectDir || process.cwd(), "mimocode.jsonc")
    const newConfigC = path.join(projectDir || process.cwd(), "octocode.jsonc")

    if (await fileExists(oldConfig) && !await fileExists(newConfig)) {
      await fs.rename(oldConfig, newConfig)
      logInfo("migrated config file", { from: oldConfig, to: newConfig })
      result.config = true
    }
    if (await fileExists(oldConfigC) && !await fileExists(newConfigC)) {
      await fs.rename(oldConfigC, newConfigC)
      logInfo("migrated config file", { from: oldConfigC, to: newConfigC })
      result.config = true
    }
  } catch (e) {
    logWarn("failed to migrate config file", { error: e })
  }

  // 2. Migrate directory: .mimocode/ → .octocode/
  try {
    const oldDir = path.join(projectDir || process.cwd(), ".mimocode")
    const newDir = path.join(projectDir || process.cwd(), ".octocode")

    if (await dirExists(oldDir) && !await dirExists(newDir)) {
      await fs.rename(oldDir, newDir)
      logInfo("migrated directory", { from: oldDir, to: newDir })
      result.directory = true
    }
  } catch (e) {
    logWarn("failed to migrate directory", { error: e })
  }

  // 3. Migrate database: mimocode.db → octocode.db (in home state dir)
  try {
    const stateDir = path.join(homeDir, ".local", "share", "mimocode")
    const oldDb = path.join(stateDir, "mimocode.db")
    const newDb = path.join(stateDir, "octocode.db")

    if (await fileExists(oldDb) && !await fileExists(newDb)) {
      await fs.rename(oldDb, newDb)
      // Also migrate WAL and SHM files
      for (const ext of ["-wal", "-shm"]) {
        const oldFile = oldDb + ext
        const newFile = newDb + ext
        if (await fileExists(oldFile)) {
          await fs.rename(oldFile, newFile)
        }
      }
      logInfo("migrated database", { from: oldDb, to: newDb })
      result.database = true
    }
  } catch (e) {
    logWarn("failed to migrate database", { error: e })
  }

  // 4. Migrate project ID: .mimocode-project-id → .octocode-project-id
  try {
    const oldId = path.join(projectDir || process.cwd(), ".mimocode-project-id")
    const newId = path.join(projectDir || process.cwd(), ".octocode-project-id")

    if (await fileExists(oldId) && !await fileExists(newId)) {
      await fs.rename(oldId, newId)
      logInfo("migrated project ID", { from: oldId, to: newId })
      result.projectId = true
    }
  } catch (e) {
    logWarn("failed to migrate project ID", { error: e })
  }

  return result
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p)
    return stat.isDirectory()
  } catch {
    return false
  }
}
