import path from "path"
import { Context, Effect, Layer, Schema } from "effect"
import { FSUtil } from "../fs-util"
import { Location } from "../location"
import { Config } from "../config"
import { ConfigObsidian } from "../config/obsidian"
import { Global } from "../global"

export interface VaultNote {
  readonly path: string
  readonly relativePath: string
  readonly content: string
  readonly title: string
  readonly frontmatter: Record<string, unknown>
  readonly body: string
}

export interface Interface {
  readonly isEnabled: () => Effect.Effect<boolean, never>
  readonly getVaultPath: () => Effect.Effect<string | undefined, never>
  readonly readAllNotes: () => Effect.Effect<ReadonlyArray<VaultNote>, never>
  readonly readProjectNotes: () => Effect.Effect<ReadonlyArray<VaultNote>, never>
  readonly readRecentSessionNotes: (limit?: number) => Effect.Effect<ReadonlyArray<VaultNote>, never>
  readonly searchNotes: (query: string) => Effect.Effect<ReadonlyArray<VaultNote>, never>
  readonly writeNote: (relativePath: string, content: string) => Effect.Effect<void, never>
  readonly getNoteContext: () => Effect.Effect<string, never>
}

export class Service extends Context.Service<Service, Interface>()("@octocode/ObsidianVault") {}

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const fm: Record<string, unknown> = {}
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":")
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim()
    if (!key) continue
    if (value === "true") fm[key] = true
    else if (value === "false") fm[key] = false
    else if (/^\d+$/.test(value)) fm[key] = parseInt(value, 10)
    else fm[key] = value
  }
  return { frontmatter: fm, body: match[2] }
}

function extractTitle(content: string, filePath: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()
  return path.basename(filePath, path.extname(filePath))
}

function matchNoteToProject(note: VaultNote, projectName: string): boolean {
  const lc = note.content.toLowerCase()
  const pn = projectName.toLowerCase()
  if (note.frontmatter.project === projectName) return true
  if (lc.includes(pn)) return true
  if (note.relativePath.toLowerCase().includes(pn)) return true
  return false
}

function matchNoteToQuery(note: VaultNote, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const lc = note.content.toLowerCase()
  const titleLc = note.title.toLowerCase()
  return terms.every((term) => lc.includes(term) || titleLc.includes(term))
}

const DEFAULT_NOTE_FOLDER = "CLI Sessions\\octocode"
const DEFAULT_MAX_CONTEXT = 20

function readNotesFromDir(fs: FSUtil.Interface, dir: string, vaultRoot: string): Effect.Effect<ReadonlyArray<VaultNote>, never> {
  return Effect.gen(function* () {
    const rawEntries = yield* fs.readDirectoryEntries(dir).pipe(
      Effect.catch(() => Effect.succeed([] as FSUtil.DirEntry[])),
    )
    const notes: VaultNote[] = []
    for (const entry of rawEntries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.type === "file" && entry.name.endsWith(".md")) {
        const content = yield* fs.readFileStringSafe(fullPath).pipe(
          Effect.catch(() => Effect.succeed(undefined as string | undefined)),
        )
        if (content !== undefined) {
          const parsed = parseFrontmatter(content)
          notes.push({
            path: fullPath,
            relativePath: path.relative(vaultRoot, fullPath).replace(/\\/g, "/"),
            content,
            title: extractTitle(content, fullPath),
            frontmatter: parsed.frontmatter,
            body: parsed.body,
          })
        }
      } else if (entry.type === "directory" && !entry.name.startsWith(".")) {
        const subNotes = yield* readNotesFromDir(fs, fullPath, vaultRoot)
        notes.push(...subNotes)
      }
    }
    return notes
  }).pipe(Effect.catch(() => Effect.succeed([] as VaultNote[])))
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const location = yield* Location.Service
    const config = yield* Config.Service
    const global = yield* Global.Service

    const getObsidianConfig = Effect.fn("ObsidianVault.getObsidianConfig")(function* () {
      const entries = yield* config.entries()
      const last = entries.findLast(
        (e): e is { type: "document"; info: { obsidian?: ConfigObsidian.Info } } =>
          e.type === "document" && (e.info as any).obsidian !== undefined,
      )
      return (last?.info as any)?.obsidian as ConfigObsidian.Info | undefined
    })

    const isEnabled = Effect.fn("ObsidianVault.isEnabled")(function* () {
      const oc = yield* getObsidianConfig()
      if (oc?.enabled === false) return false
      if (oc?.vault_path) return true
      const defaultPath = "D:\\SOFTWARE\\obsidian\\brain for ai\\brain"
      return yield* fs.existsSafe(defaultPath)
    })

    const getVaultPath = Effect.fn("ObsidianVault.getVaultPath")(function* () {
      const oc = yield* getObsidianConfig()
      if (oc?.vault_path) return oc.vault_path
      const defaultPath = "D:\\SOFTWARE\\obsidian\\brain for ai\\brain"
      const exists = yield* fs.existsSafe(defaultPath)
      return exists ? defaultPath : undefined
    })

    const getNoteFolder = Effect.fn("ObsidianVault.getNoteFolder")(function* () {
      const oc = yield* getObsidianConfig()
      return oc?.note_folder ?? DEFAULT_NOTE_FOLDER
    })

    const readAllNotes = Effect.fn("ObsidianVault.readAllNotes")(function* () {
      const vaultPath = yield* getVaultPath()
      if (!vaultPath) return []
      const noteFolder = yield* getNoteFolder()
      const targetDir = path.join(vaultPath, noteFolder)
      const exists = yield* fs.existsSafe(targetDir)
      if (!exists) return []
      return yield* readNotesFromDir(fs, targetDir, vaultPath)
    })

    const readProjectNotes = Effect.fn("ObsidianVault.readProjectNotes")(function* () {
      const all = yield* readAllNotes()
      const projectName = path.basename(location.project.directory)
      return all.filter((note) => matchNoteToProject(note, projectName))
    })

    const readRecentSessionNotes = Effect.fn("ObsidianVault.readRecentSessionNotes")(function* (limit = 10) {
      const all = yield* readAllNotes()
      const sessionNotes = all
        .filter((note) => note.frontmatter.type === "session" || note.relativePath.includes("Sessions"))
        .sort((a, b) => {
          const aDate = String(a.frontmatter.created ?? "")
          const bDate = String(b.frontmatter.created ?? "")
          return bDate.localeCompare(aDate)
        })
      return sessionNotes.slice(0, limit)
    })

    const searchNotes = Effect.fn("ObsidianVault.searchNotes")(function* (query: string) {
      const all = yield* readAllNotes()
      return all.filter((note) => matchNoteToQuery(note, query))
    })

    const writeNote = Effect.fn("ObsidianVault.writeNote")(function* (relativePath: string, content: string) {
      const vaultPath = yield* getVaultPath()
      if (!vaultPath) return
      const fullPath = path.join(vaultPath, relativePath)
      yield* fs.writeWithDirs(fullPath, content).pipe(Effect.catch(() => Effect.void))
    })

    const getNoteContext = Effect.fn("ObsidianVault.getNoteContext")(function* () {
      const enabled = yield* isEnabled()
      if (!enabled) return ""

      const oc = yield* getObsidianConfig()
      const maxNotes = oc?.max_context_notes ?? DEFAULT_MAX_CONTEXT
      const projectName = path.basename(location.project.directory)

      const projectNotes = yield* readProjectNotes()
      const recentSessions = yield* readRecentSessionNotes(5)

      const notesToInclude = [...recentSessions, ...projectNotes]
        .filter((note, index, self) => self.findIndex((n) => n.path === note.path) === index)
        .slice(0, maxNotes)

      if (notesToInclude.length === 0) return ""

      const parts = [
        `## Obsidian Vault Context (${notesToInclude.length} notes for project "${projectName}")`,
        "",
      ]

      for (const note of notesToInclude) {
        const preview = note.body.slice(0, 500).trim()
        parts.push(`### ${note.title}`)
        parts.push(`Path: ${note.relativePath}`)
        if (note.frontmatter.type) parts.push(`Type: ${note.frontmatter.type}`)
        if (note.frontmatter.created) parts.push(`Created: ${note.frontmatter.created}`)
        parts.push("")
        parts.push(preview)
        if (note.body.length > 500) parts.push("... (truncated)")
        parts.push("")
      }

      return parts.join("\n")
    })

    return Service.of({
      isEnabled,
      getVaultPath,
      readAllNotes,
      readProjectNotes,
      readRecentSessionNotes,
      searchNotes,
      writeNote,
      getNoteContext,
    })
  }),
)

export * as ObsidianVault from "./vault"
