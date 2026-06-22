import { createSignal, createMemo, onCleanup, onMount, For, Show, createEffect } from "solid-js"
import { useDialog } from "../ui/dialog"
import { useTheme } from "../context/theme"
import { useSDK } from "../context/sdk"
import { useSync } from "../context/sync"
import { useEvent } from "../context/event"
import { useToast } from "../ui/toast"
import { TextAttributes, RGBA, TextareaRenderable } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { useTuiConfig } from "../config"
import { getScrollAcceleration } from "../util/scroll"
import { useBindings } from "../keymap"
import open from "open"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import {
  loadBrain,
  saveBrain,
  trackSession,
  trackFile,
  trackProject,
  buildBrainGraph,
  mergeRelatedSessions,
  queueSync,
  processSyncQueue,
  syncToObsidianVault,
  syncSessionToVault,
  syncSessionToFolder,
  getVaultSubfolders,
  readFolderContents,
  ensureOctoFolder,
  findSessionNote,
  writeSessionNote,
  buildSessionSummary,
  generateSessionTitle,
  sessionNoteExists,
  findSessionNoteFolder,
  appendToSessionNote,
  getBrainStats,
  type BrainData,
} from "../util/brain"

const OBSIDIAN_HELP_URL = "https://forum.obsidian.md/t/how-to-find-find-your-api-key-in-your-obsidian/64505/2"

// Obsidian graph color palette
const OBSIDIAN_COLORS = {
  background: "#1e1e2e",
  node: {
    file: "#a6e3a1",      // green
    session: "#89b4fa",   // blue
    project: "#cba6f7",   // purple
    concept: "#f9e2af",   // yellow
    unresolved: "#6c7086", // gray
  },
  edge: "#45475a",        // dark gray
  edgeHighlight: "#585b70",
  label: "#cdd6f4",       // light text
  labelMuted: "#6c7086",
  selected: "#f38ba8",    // pink
  hover: "#94e2d5",       // teal
}

interface ObsidianConfig {
  apiKey: string
  host: string
  port: string
  connected: boolean
  vaultPath?: string
  subfolders?: string[]
}

function getConfigDir(): string {
  const dataDir = process.platform === "win32"
    ? path.join(os.homedir(), "AppData", "Local", "octo")
    : path.join(os.homedir(), ".local", "share", "octo")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

function getConfigPath(): string {
  return path.join(getConfigDir(), "obsidian-config.json")
}

function loadObsidianConfig(): ObsidianConfig | null {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8")
      return JSON.parse(data)
    }
  } catch {}
  return null
}

function saveObsidianConfig(config: ObsidianConfig): void {
  try {
    const configPath = getConfigPath()
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8")
  } catch {}
}

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  vx: number
  vy: number
  mass: number
  color: string
  connections: number
  type: "file" | "session" | "project" | "concept"
  size: number
}

interface GraphEdge {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// Force layout constants - tight ball without overlapping
const REPULSION = 30
const ATTRACTION = 0.04
const DAMPING = 0.78
const CENTER_GRAVITY = 0.04
const MIN_DISTANCE = 4
const MAX_ITERATIONS = 200

function createForceLayout(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number): GraphNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Build adjacency for clustering bonus
  const adjacency = new Map<string, Set<string>>()
  for (const node of nodes) {
    adjacency.set(node.id, new Set())
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  }

    // Shared-neighbor clustering: nodes with shared neighbors pull together
    function clusteringForce(a: GraphNode, b: GraphNode): { fx: number; fy: number } {
      const neighborsA = adjacency.get(a.id)
      const neighborsB = adjacency.get(b.id)
      if (!neighborsA || !neighborsB) return { fx: 0, fy: 0 }

      let shared = 0
      for (const n of neighborsA) {
        if (neighborsB.has(n)) shared++
      }
      if (shared === 0) return { fx: 0, fy: 0 }

      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DISTANCE)
      const force = shared * 0.5
      return {
      fx: (dx / dist) * force,
      fy: (dy / dist) * force,
    }
  }

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const progress = iter / MAX_ITERATIONS

    // Repulsion between all nodes (decays for tighter clustering)
    const currentRepulsion = REPULSION * (1 - progress * 0.4)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DISTANCE)
        const force = currentRepulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx / a.mass
        a.vy -= fy / a.mass
        b.vx += fx / b.mass
        b.vy += fy / b.mass
      }
    }

    // Attraction along edges (increases moderately)
    const currentAttraction = ATTRACTION * (1 + progress * 0.3)
    for (const edge of edges) {
      const a = nodeMap.get(edge.source)
      const b = nodeMap.get(edge.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const force = dist * currentAttraction
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx += fx / a.mass
      a.vy += fy / a.mass
      b.vx -= fx / b.mass
      b.vy -= fy / b.mass
    }

    // Clustering: shared neighbors attract
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const cf = clusteringForce(nodes[i], nodes[j])
        nodes[i].vx += cf.fx / nodes[i].mass
        nodes[i].vy += cf.fy / nodes[i].mass
        nodes[j].vx -= cf.fx / nodes[j].mass
        nodes[j].vy -= cf.fy / nodes[j].mass
      }
    }

    // Center gravity (pulls everything into a tight ball)
    const cx = width / 2
    const cy = height / 2
    const currentGravity = CENTER_GRAVITY * (1 + progress * 1.0)
    for (const node of nodes) {
      node.vx += (cx - node.x) * currentGravity
      node.vy += (cy - node.y) * currentGravity
    }

    // Apply velocities
    for (const node of nodes) {
      node.vx *= DAMPING
      node.vy *= DAMPING
      node.x += node.vx
      node.y += node.vy
      node.x = Math.max(2, Math.min(width - 3, node.x))
      node.y = Math.max(1, Math.min(height - 2, node.y))
    }
  }

  // Post-layout collision resolution: push overlapping nodes apart
  // Each node gets a unique grid position so no dots are hidden
  const occupied = new Map<string, GraphNode>()
  for (const node of nodes) {
    // Clamp to canvas bounds first
    node.x = Math.max(2, Math.min(width - 3, node.x))
    node.y = Math.max(1, Math.min(height - 2, node.y))
    const key = `${Math.round(node.x)},${Math.round(node.y)}`
    if (occupied.has(key)) {
      // Find nearest empty spot within canvas bounds
      let placed = false
      for (let r = 1; r < Math.max(width, height) && !placed; r++) {
        for (let dx = -r; dx <= r && !placed; dx++) {
          for (let dy = -r; dy <= r && !placed; dy++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
            const nx = Math.round(node.x) + dx
            const ny = Math.round(node.y) + dy
            const nk = `${nx},${ny}`
            if (!occupied.has(nk) && nx >= 2 && nx < width - 3 && ny >= 1 && ny < height - 2) {
              node.x = nx
              node.y = ny
              occupied.set(nk, node)
              placed = true
            }
          }
        }
      }
      if (!placed) {
        // Find ANY free cell on the grid as last resort
        for (let y = 1; y < height - 2 && !placed; y++) {
          for (let x = 2; x < width - 3 && !placed; x++) {
            const nk = `${x},${y}`
            if (!occupied.has(nk)) {
              node.x = x
              node.y = y
              occupied.set(nk, node)
              placed = true
            }
          }
        }
      }
    } else {
      occupied.set(key, node)
    }
  }

  return nodes
}

// API Key Setup using DialogPrompt pattern
function ApiKeyInput(props: { onConfirm: (key: string) => void; onCancel: () => void }) {
  const { theme } = useTheme()
  const [textareaTarget, setTextareaTarget] = createSignal<TextareaRenderable>()
  let textarea: TextareaRenderable

  useBindings(() => ({
    target: textareaTarget,
    enabled: textareaTarget() !== undefined,
    priority: 1,
    bindings: [
      {
        key: "return",
        desc: "Submit API key",
        group: "Dialog",
        cmd: () => {
          if (textarea && !textarea.isDestroyed) {
            props.onConfirm(textarea.plainText)
          }
        },
      },
    ],
  }))

  onMount(() => {
    setTimeout(() => {
      if (textarea && !textarea.isDestroyed) {
        textarea.focus()
      }
    }, 1)
  })

  return (
    <box flexDirection="column" gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>API Key</text>
        <text fg={theme.textMuted} onMouseUp={() => props.onCancel()}>esc</text>
      </box>
      <text fg={theme.textMuted}>Paste your Obsidian Local REST API key:</text>
      <textarea
        height={3}
        ref={(val: TextareaRenderable) => {
          textarea = val
          setTextareaTarget(val)
        }}
        placeholder="paste-api-key-here"
        placeholderColor={theme.textMuted}
        textColor={theme.text}
        focusedTextColor={theme.text}
        cursorColor={theme.primary}
      />
      <text fg={theme.textMuted}>
        <span style={{ fg: theme.text }}>enter</span> submit
      </text>
    </box>
  )
}

// Vault Path Input
function VaultPathInput(props: { onConfirm: (path: string) => void; onCancel: () => void }) {
  const { theme } = useTheme()
  const [textareaTarget, setTextareaTarget] = createSignal<TextareaRenderable>()
  let textarea: TextareaRenderable

  useBindings(() => ({
    target: textareaTarget,
    enabled: textareaTarget() !== undefined,
    priority: 1,
    bindings: [
      {
        key: "return",
        desc: "Submit vault path",
        group: "Dialog",
        cmd: () => {
          if (textarea && !textarea.isDestroyed) {
            props.onConfirm(textarea.plainText)
          }
        },
      },
    ],
  }))

  onMount(() => {
    setTimeout(() => {
      if (textarea && !textarea.isDestroyed) {
        textarea.focus()
      }
    }, 1)
  })

  return (
    <box flexDirection="column" gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>Obsidian Vault Path</text>
        <text fg={theme.textMuted} onMouseUp={() => props.onCancel()}>esc</text>
      </box>
      <text fg={theme.textMuted}>Enter the full path to your Obsidian vault:</text>
      <textarea
        height={3}
        ref={(val: TextareaRenderable) => {
          textarea = val
          setTextareaTarget(val)
        }}
        placeholder="C:\Users\YourName\Documents\MyVault"
        placeholderColor={theme.textMuted}
        textColor={theme.text}
        focusedTextColor={theme.text}
        cursorColor={theme.primary}
      />
      <text fg={theme.textMuted}>
        <span style={{ fg: theme.text }}>enter</span> submit
      </text>
      <text fg={theme.textMuted}>Session summaries will be saved as .md files in your vault</text>
    </box>
  )
}

// API Key Setup Screen
function ApiKeySetup(props: { onComplete: () => void; onBack: () => void }) {
  const { theme } = useTheme()
  const toast = useToast()
  const dimensions = useTerminalDimensions()
  const [step, setStep] = createSignal<"instructions" | "apikey" | "vaultpath">("instructions")
  const [apiKey, setApiKey] = createSignal("")
  const [vaultPath, setVaultPath] = createSignal("")
  const [isConnecting, setIsConnecting] = createSignal(false)

  async function handleConnect() {
    if (!apiKey()) {
      toast.show({ message: "Please enter your API key", variant: "warning" })
      return
    }
    if (!vaultPath()) {
      toast.show({ message: "Please enter your Obsidian vault path", variant: "warning" })
      return
    }
    if (!fs.existsSync(vaultPath())) {
      toast.show({ message: "Vault path does not exist", variant: "warning" })
      return
    }

    setIsConnecting(true)
    const config: ObsidianConfig = {
      apiKey: apiKey(),
      host: "localhost",
      port: "27123",
      connected: true,
      vaultPath: vaultPath(),
    }
    saveObsidianConfig(config)

    setTimeout(() => {
      setIsConnecting(false)
      toast.show({ message: "Obsidian connected and vault configured!", variant: "success" })
      props.onComplete()
    }, 1500)
  }

  return (
    <box flexDirection="column" flexGrow={1} height={dimensions().height}>
      <box flexDirection="row" justifyContent="space-between" alignItems="center" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
        <text fg={theme.primary} attributes={TextAttributes.BOLD} onMouseUp={() => props.onBack()}>← Back</text>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>Obsidian Setup</text>
        <text fg={theme.primary} onMouseUp={() => open(OBSIDIAN_HELP_URL).catch(() => {})}>Help</text>
      </box>

      <box flexDirection="column" flexGrow={1} paddingLeft={4} paddingRight={4} paddingTop={2} gap={1}>
        <Show when={step() === "instructions"} fallback={
          <Show when={step() === "apikey"} fallback={
            <VaultPathInput
              onConfirm={(p) => {
                setVaultPath(p)
                handleConnect()
              }}
              onCancel={() => setStep("apikey")}
            />
          }>
            <ApiKeyInput
              onConfirm={(key) => {
                setApiKey(key)
                setStep("vaultpath")
              }}
              onCancel={() => setStep("instructions")}
            />
          </Show>
        }>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>Connect to Obsidian</text>
          <text fg={theme.textMuted}>To use the Memory graph, you need the Obsidian Local REST API plugin.</text>

          <box paddingTop={1}>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>Step 1: Install the Plugin</text>
            <text fg={theme.textMuted}>Open Obsidian → Settings → Community Plugins → Browse → Search "Local REST API" → Install</text>
          </box>

          <box paddingTop={1}>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>Step 2: Enable and Copy API Key</text>
            <text fg={theme.textMuted}>Enable the plugin → Click on it → Copy the API Key</text>
          </box>

          <box paddingTop={1}>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>Step 3: Enter Your API Key</text>
            <text fg={theme.textMuted}>Click below to enter your API key</text>
          </box>

          <box paddingTop={1}>
            <text
              fg={theme.primary}
              attributes={TextAttributes.BOLD}
              onMouseUp={() => setStep("apikey")}
            >
              → Enter API Key
            </text>
          </box>
        </Show>
      </box>

      <box flexDirection="row" justifyContent="center" paddingLeft={2} paddingRight={2} paddingBottom={1}>
        <text fg={theme.textMuted}>Your API key is stored locally and never leaves your computer</text>
      </box>
    </box>
  )
}

// Vault Path Dialog - modal overlay
function VaultPathModal(props: { currentPath: string | null; onConfirm: (path: string) => void; onCancel: () => void }) {
  const { theme } = useTheme()
  const toast = useToast()
  const dimensions = useTerminalDimensions()
  const [textareaTarget, setTextareaTarget] = createSignal<TextareaRenderable>()
  const [step, setStep] = createSignal<"path" | "subfolders">("path")
  const [savedPath, setSavedPath] = createSignal("")
  const [currentTextarea, setCurrentTextarea] = createSignal<TextareaRenderable | null>(null)

  useBindings(() => ({
    target: textareaTarget,
    enabled: textareaTarget() !== undefined,
    priority: 1,
    bindings: [
      {
        key: "return",
        desc: step() === "path" ? "Next" : "Save",
        group: "Dialog",
        cmd: () => {
          const ta = currentTextarea()
          if (!ta || ta.isDestroyed) return
          const text = ta.plainText
          if (step() === "path") {
            if (text && fs.existsSync(text)) {
              setSavedPath(text)
              setStep("subfolders")
            } else {
              toast.show({ message: "Path does not exist", variant: "warning" })
            }
          } else {
            const config = loadObsidianConfig() || {
              apiKey: "",
              host: "localhost",
              port: "27123",
              connected: false,
            }
            config.vaultPath = savedPath()
            const subfolders = text.split(",").map((s) => s.trim()).filter(Boolean)
            config.subfolders = subfolders
            for (const sub of subfolders) {
              const subPath = path.join(savedPath(), sub)
              if (!fs.existsSync(subPath)) {
                fs.mkdirSync(subPath, { recursive: true })
              }
              ensureOctoFolder(subPath)
            }
            saveObsidianConfig(config)
            props.onConfirm(savedPath())
          }
        },
      },
      {
        key: "escape",
        desc: "Back",
        group: "Dialog",
        cmd: () => {
          if (step() === "subfolders") {
            setStep("path")
          } else {
            props.onCancel()
          }
        },
      },
    ],
  }))

  onMount(() => {
    setTimeout(() => {
      const ta = currentTextarea()
      if (ta && !ta.isDestroyed) {
        ta.focus()
      }
    }, 1)
  })

  const w = dimensions().width
  const h = dimensions().height
  const boxW = Math.min(70, w - 8)
  const boxH = 12
  const boxX = Math.floor((w - boxW) / 2)
  const boxY = Math.floor((h - boxH) / 2)

  return (
    <box flexDirection="column" position="absolute" left={0} top={0} width={w} height={h}>
      {/* Dark overlay */}
      <box position="absolute" left={0} top={0} width={w} height={h} backgroundColor="#000000CC" />
      {/* Dialog box */}
      <box
        position="absolute"
        left={boxX}
        top={boxY}
        width={boxW}
        height={boxH + 2}
        flexDirection="column"
        gap={1}
        border={["top", "bottom", "left", "right"]}
        borderColor={OBSIDIAN_COLORS.hover}
        backgroundColor="#1e1e2e"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
      >
        <box flexDirection="row" justifyContent="space-between">
          <text attributes={TextAttributes.BOLD} fg={OBSIDIAN_COLORS.label}>
            {step() === "path" ? "Obsidian Vault Path" : "Subfolders to Sync"}
          </text>
          <text fg={OBSIDIAN_COLORS.labelMuted} onMouseUp={() => step() === "path" ? props.onCancel() : setStep("path")}>esc</text>
        </box>

        <Show when={props.currentPath} fallback={
          <text fg={OBSIDIAN_COLORS.labelMuted}>No vault path configured yet.</text>
        }>
          <text fg={OBSIDIAN_COLORS.labelMuted}>Current: <span style={{ fg: OBSIDIAN_COLORS.node.file }}>{props.currentPath}</span></text>
        </Show>

        <Show when={step() === "path"} fallback={
          <>
            <text fg={OBSIDIAN_COLORS.labelMuted}>Enter comma-separated folder names inside your vault:</text>
            <textarea
              height={3}
              ref={(val: TextareaRenderable) => {
                setCurrentTextarea(val)
                setTextareaTarget(val)
              }}
              placeholder="notes, projects, journal"
              placeholderColor={OBSIDIAN_COLORS.labelMuted}
              textColor={OBSIDIAN_COLORS.label}
              focusedTextColor={OBSIDIAN_COLORS.label}
              cursorColor={OBSIDIAN_COLORS.hover}
            />
            <text fg={OBSIDIAN_COLORS.labelMuted}>OctoCode folders auto-created. Leave empty to skip.</text>
          </>
        }>
          <text fg={OBSIDIAN_COLORS.labelMuted}>Enter the full path to your Obsidian vault:</text>
          <textarea
            height={3}
            ref={(val: TextareaRenderable) => {
              setCurrentTextarea(val)
              setTextareaTarget(val)
            }}
            placeholder={props.currentPath || "C:\\Users\\YourName\\Documents\\MyVault"}
            placeholderColor={OBSIDIAN_COLORS.labelMuted}
            textColor={OBSIDIAN_COLORS.label}
            focusedTextColor={OBSIDIAN_COLORS.label}
            cursorColor={OBSIDIAN_COLORS.hover}
          />
        </Show>

        <text fg={OBSIDIAN_COLORS.labelMuted}>
          <span style={{ fg: OBSIDIAN_COLORS.hover }}>enter</span> {step() === "path" ? "next" : "save"}
        </text>
      </box>
    </box>
  )
}

// Session Detail Dialog - shows Obsidian note, allows editing
function SessionDetailDialog(props: {
  sessionId: string
  sessionLabel: string
  onClose: () => void
}) {
  const { theme } = useTheme()
  const toast = useToast()
  const dimensions = useTerminalDimensions()
  const [content, setContent] = createSignal("")
  const [editMode, setEditMode] = createSignal(false)
  const [noteFolder, setNoteFolder] = createSignal<string | null>(null)
  const [textareaTarget, setTextareaTarget] = createSignal<TextareaRenderable>()
  let textarea: TextareaRenderable

  onMount(() => {
    const config = loadObsidianConfig()
    if (config && config.vaultPath) {
      const subfolders = config.subfolders || []
      const result = findSessionNote(props.sessionId, config.vaultPath, subfolders)
      if (result) {
        setContent(result.content)
        setNoteFolder(result.folder)
      } else {
        setContent(`# ${props.sessionLabel}\n\nNo note found in vault. Click edit to create one.`)
      }
    } else {
      setContent(`# ${props.sessionLabel}\n\nNo vault configured. Set up your vault in the Vault settings.`)
    }
  })

  useBindings(() => ({
    target: textareaTarget,
    enabled: editMode() && textareaTarget() !== undefined,
    priority: 1,
    bindings: [
      {
        key: "return",
        desc: "Save note",
        group: "Dialog",
        cmd: () => {
          if (textarea && !textarea.isDestroyed) {
            const newContent = textarea.plainText
            const config = loadObsidianConfig()
            if (config && config.vaultPath) {
              const saved = writeSessionNote(props.sessionId, config.vaultPath, newContent)
              if (saved) {
                setContent(newContent)
                setEditMode(false)
                toast.show({ message: "Note saved to vault!", variant: "success" })
              } else {
                toast.show({ message: "Failed to save note", variant: "warning" })
              }
            }
          }
        },
      },
      {
        key: "escape",
        desc: editMode() ? "Cancel edit" : "Close",
        group: "Dialog",
        cmd: () => {
          if (editMode()) {
            setEditMode(false)
          } else {
            props.onClose()
          }
        },
      },
    ],
  }))

  // Pre-fill textarea when entering edit mode
  createEffect(() => {
    if (editMode() && textarea && !textarea.isDestroyed) {
      setTimeout(() => {
        if (textarea && !textarea.isDestroyed) {
          textarea.insertText(content())
          textarea.focus()
        }
      }, 50)
    }
  })

  onMount(() => {
    setTimeout(() => {
      if (editMode() && textarea && !textarea.isDestroyed) {
        textarea.focus()
      }
    }, 1)
  })

  const w = dimensions().width
  const h = dimensions().height
  const boxW = Math.min(80, w - 6)
  const boxH = Math.min(h - 6, 30)
  const boxX = Math.floor((w - boxW) / 2)
  const boxY = Math.floor((h - boxH) / 2)

  return (
    <box flexDirection="column" position="absolute" left={0} top={0} width={w} height={h}>
      <box position="absolute" left={0} top={0} width={w} height={h} backgroundColor="#000000CC" />
      <box
        position="absolute"
        left={boxX}
        top={boxY}
        width={boxW}
        height={boxH}
        flexDirection="column"
        border={["top", "bottom", "left", "right"]}
        borderColor={OBSIDIAN_COLORS.hover}
        backgroundColor="#1e1e2e"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
      >
        <box flexDirection="row" justifyContent="space-between" paddingBottom={1}>
          <text attributes={TextAttributes.BOLD} fg={OBSIDIAN_COLORS.node.session}>{props.sessionLabel}</text>
          <box flexDirection="row" gap={2}>
            <text
              fg={editMode() ? OBSIDIAN_COLORS.node.concept : OBSIDIAN_COLORS.hover}
              onMouseUp={() => {
                if (editMode()) {
                  setEditMode(false)
                } else {
                  setEditMode(true)
                  setTimeout(() => {
                    if (textarea && !textarea.isDestroyed) textarea.focus()
                  }, 1)
                }
              }}
            >
              {editMode() ? "cancel" : "edit"}
            </text>
            <text fg={OBSIDIAN_COLORS.labelMuted} onMouseUp={() => props.onClose()}>esc</text>
          </box>
        </box>

        {noteFolder() && (
          <text fg={OBSIDIAN_COLORS.labelMuted} paddingBottom={1}>
            <span style={{ fg: OBSIDIAN_COLORS.node.file }}>{noteFolder()}</span>
          </text>
        )}

        <Show when={!editMode()} fallback={
          <textarea
            height={boxH - 8}
            ref={(val: TextareaRenderable) => {
              textarea = val
              setTextareaTarget(val)
            }}
            textColor={OBSIDIAN_COLORS.label}
            focusedTextColor={OBSIDIAN_COLORS.label}
            cursorColor={OBSIDIAN_COLORS.hover}
          />
        }>
          <box flexDirection="column" flexGrow={1} overflow="hidden">
            {content().split("\n").slice(0, boxH - 8).map((line) => (
              <text fg={OBSIDIAN_COLORS.label}>{line}</text>
            ))}
          </box>
        </Show>

        <text fg={OBSIDIAN_COLORS.labelMuted} paddingTop={1}>
          {editMode()
            ? "enter save · esc cancel"
            : "e edit · esc close"}
        </text>
      </box>
    </box>
  )
}

// Main Graph View - Obsidian-style
function GraphView() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const sync = useSync()
  const event = useEvent()
  const toast = useToast()
  const tuiConfig = useTuiConfig()
  const acc = createMemo(() => getScrollAcceleration(tuiConfig))
  const dimensions = useTerminalDimensions()

  const [graphData, setGraphData] = createSignal<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = createSignal<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = createSignal<GraphNode | null>(null)
  const [isAnimating, setIsAnimating] = createSignal(true)
  const [animationFrame, setAnimationFrame] = createSignal(0)
  const [brainData, setBrainData] = createSignal<BrainData | null>(null)
  const [stats, setStats] = createSignal({ sessions: 0, files: 0, projects: 0 })
  const [syncStatus, setSyncStatus] = createSignal<"idle" | "syncing" | "synced">("idle")
  const [vaultPath, setVaultPath] = createSignal<string | null>(null)
  const [showVaultDialog, setShowVaultDialog] = createSignal(false)
  const [showSessionDetail, setShowSessionDetail] = createSignal<{ id: string; label: string } | null>(null)
  const [zoom, setZoom] = createSignal(1)
  const [panX, setPanX] = createSignal(0)
  const [panY, setPanY] = createSignal(0)
  const [showLabels, setShowLabels] = createSignal(true)
  let lastDragX = 0
  let lastDragY = 0
  let clickStartX = 0
  let clickStartY = 0

  const graphWidth = createMemo(() => dimensions().width - 4)
  const graphHeight = createMemo(() => dimensions().height - 6)

  // Zoom and pan bindings
  useBindings(() => ({
    enabled: true,
    priority: 2,
    bindings: [
      { key: "+", desc: "Zoom in", group: "Graph", cmd: () => setZoom((z) => Math.min(z * 1.2, 5)) },
      { key: "=", desc: "Zoom in", group: "Graph", cmd: () => setZoom((z) => Math.min(z * 1.2, 5)) },
      { key: "-", desc: "Zoom out", group: "Graph", cmd: () => setZoom((z) => Math.max(z / 1.2, 0.3)) },
      { key: "0", desc: "Reset zoom", group: "Graph", cmd: () => { setZoom(1); setPanX(0); setPanY(0) } },
      { key: "l", desc: "Toggle labels", group: "Graph", cmd: () => setShowLabels((s) => !s) },
      { key: "up", desc: "Pan up", group: "Graph", cmd: () => setPanY((y) => y + 2) },
      { key: "down", desc: "Pan down", group: "Graph", cmd: () => setPanY((y) => y - 2) },
      { key: "left", desc: "Pan left", group: "Graph", cmd: () => setPanX((x) => x + 2) },
      { key: "right", desc: "Pan right", group: "Graph", cmd: () => setPanX((x) => x - 2) },
    ],
  }))

  // Load brain data
  onMount(() => {
    let brain = loadBrain()
    const config = loadObsidianConfig()
    if (config && config.vaultPath) {
      setVaultPath(config.vaultPath)
    }

    processSyncQueue()

    const sessions = sync.data.session || []
    for (const session of sessions) {
      const files = session.summary?.diffs?.map((d) => d.file || "").filter(Boolean) || []
      brain = trackSession(brain, {
        id: session.id,
        title: session.title || "Untitled Session",
        files,
        summary: "",
        tokens: (session.tokens?.input || 0) + (session.tokens?.output || 0),
        project: session.directory ? path.basename(session.directory) : undefined,
      })
      for (const file of files) {
        brain = trackFile(brain, file, session.id)
      }
      if (session.directory) {
        brain = trackProject(brain, session.directory, session.id)
      }
    }

    brain = mergeRelatedSessions(brain)
    saveBrain(brain)
    setBrainData(brain)
    refreshGraph(brain)

    const brainStats = getBrainStats(brain)
    setStats({
      sessions: brainStats.totalSessions,
      files: brainStats.totalFiles,
      projects: brainStats.totalProjects,
    })
  })

  // Real-time event listeners
  event.on("session.updated", (evt) => {
    const session = evt.properties.info
    if (!session) return

    setSyncStatus("syncing")
    const files = session.summary?.diffs?.map((d) => d.file || "").filter(Boolean) || []

    queueSync("session", {
      id: session.id,
      title: session.title || "Untitled Session",
      files,
      summary: "",
      tokens: (session.tokens?.input || 0) + (session.tokens?.output || 0),
      project: session.directory ? path.basename(session.directory) : undefined,
    })

    for (const file of files) {
      queueSync("file", { path: file, sessionId: session.id })
    }
    if (session.directory) {
      queueSync("project", { path: session.directory, sessionId: session.id })
    }

    setTimeout(() => {
      processSyncQueue()
      const brain = loadBrain()
      setBrainData(brain)
      refreshGraph(brain)
      const brainStats = getBrainStats(brain)
      setStats({
        sessions: brainStats.totalSessions,
        files: brainStats.totalFiles,
        projects: brainStats.totalProjects,
      })
      setSyncStatus("synced")
      setTimeout(() => setSyncStatus("idle"), 1000)

      const config = loadObsidianConfig()
      if (config && config.connected && config.vaultPath) {
        const sessionData = brain.sessions.find((s) => s.id === session.id)
        if (sessionData) {
          syncSessionToVault(sessionData, config.vaultPath)
          // Also sync to all subfolders that have OctoCode folders
          const subfolders = getVaultSubfolders(config.vaultPath)
          for (const sub of subfolders) {
            const subContents = readFolderContents(sub)
            if (subContents.some((f) => f.name === "OctoCode")) {
              syncSessionToFolder(sessionData, sub)
            }
          }
          // Sync to any user-specified subfolders
          for (const subfolder of config.subfolders || []) {
            const subPath = path.join(config.vaultPath, subfolder)
            if (fs.existsSync(subPath)) {
              ensureOctoFolder(subPath)
              syncSessionToFolder(sessionData, subPath)
            }
          }
        }
      }
    }, 500)
  })

  event.on("session.diff", (evt) => {
    const diff = evt.properties.diff
    if (!diff) return
    for (const fileDiff of diff) {
      if (fileDiff.file) {
        queueSync("file", { path: fileDiff.file, sessionId: evt.properties.sessionID })
      }
    }
  })

  // Auto-documentation: track last active session
  let lastActiveSessionId: string | null = null
  let lastSessionId: string | null = null
  let documentedSessionIds = new Set<string>()

  // When a session goes idle, auto-document it (idempotent — appends, never duplicates)
  event.on("session.status", (evt) => {
    if (evt.properties.status.type !== "idle") return
    const sessionId = evt.properties.sessionID
    if (!sessionId) return
    if (documentedSessionIds.has(sessionId)) return

    try {
      const config = loadObsidianConfig()
      if (!config || !config.connected || !config.vaultPath) return

      const brain = loadBrain()
      const session = brain.sessions.find((s) => s.id === sessionId)
      if (!session) return

      const subfolders = config.subfolders || []
      const existingFolder = findSessionNoteFolder(sessionId, config.vaultPath, subfolders)

      if (existingFolder) {
        // Note exists — append new content, don't duplicate
        const newActions = `- Session went idle at ${new Date().toLocaleTimeString()}\n`
        appendToSessionNote(sessionId, existingFolder, newActions, session.files)
      } else {
        // First time — create the note
        const summary = buildSessionSummary(session, brain)
        const filename = `${session.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50)}_${session.id.slice(0, 8)}.md`
        const sessionsDir = path.join(config.vaultPath, "OctoCode", "Sessions")
        if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true })
        fs.writeFileSync(path.join(sessionsDir, filename), summary, "utf-8")

        for (const sub of subfolders) {
          const subPath = path.join(config.vaultPath, sub)
          if (fs.existsSync(subPath)) {
            ensureOctoFolder(subPath)
            const subSessionsDir = path.join(subPath, "OctoCode", "Sessions")
            if (!fs.existsSync(subSessionsDir)) fs.mkdirSync(subSessionsDir, { recursive: true })
            fs.writeFileSync(path.join(subSessionsDir, filename), summary, "utf-8")
          }
        }
      }
      documentedSessionIds.add(sessionId)
    } catch {}
    lastActiveSessionId = sessionId
  })

  // When a new session is created — auto-rename if default title + document previous
  event.on("session.created", (evt) => {
    const sessionId = evt.properties.sessionID
    if (!sessionId) return

    // Document previous session (idempotent)
    if (lastActiveSessionId && lastActiveSessionId !== sessionId && !documentedSessionIds.has(lastActiveSessionId)) {
      try {
        const config = loadObsidianConfig()
        if (config && config.connected && config.vaultPath) {
          const brain = loadBrain()
          const session = brain.sessions.find((s) => s.id === lastActiveSessionId)
          if (session) {
            const subfolders = config.subfolders || []
            const existingFolder = findSessionNoteFolder(lastActiveSessionId, config.vaultPath, subfolders)

            if (existingFolder) {
              const newActions = `- Session completed, new session started at ${new Date().toLocaleTimeString()}\n`
              appendToSessionNote(lastActiveSessionId, existingFolder, newActions, session.files)
            } else {
              const summary = buildSessionSummary(session, brain)
              const filename = `${session.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50)}_${session.id.slice(0, 8)}.md`
              const sessionsDir = path.join(config.vaultPath, "OctoCode", "Sessions")
              if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true })
              fs.writeFileSync(path.join(sessionsDir, filename), summary, "utf-8")

              for (const sub of subfolders) {
                const subPath = path.join(config.vaultPath, sub)
                if (fs.existsSync(subPath)) {
                  ensureOctoFolder(subPath)
                  const subSessionsDir = path.join(subPath, "OctoCode", "Sessions")
                  if (!fs.existsSync(subSessionsDir)) fs.mkdirSync(subSessionsDir, { recursive: true })
                  fs.writeFileSync(path.join(subSessionsDir, filename), summary, "utf-8")
                }
              }
            }
            documentedSessionIds.add(lastActiveSessionId)
          }
        }
      } catch {}
    }

    lastActiveSessionId = sessionId
    lastSessionId = sessionId
  })

  // Auto-sync timer
  let syncTimer: ReturnType<typeof setInterval> | null = null
  createEffect(() => {
    syncTimer = setInterval(() => {
      const config = loadObsidianConfig()
      if (config && config.connected) {
        syncToObsidianVault(config.host)
        if (config.vaultPath) {
          const brain = loadBrain()
          for (const session of brain.sessions.slice(-10)) {
            syncSessionToVault(session, config.vaultPath)
            // Sync to subfolders with OctoCode
            const subfolders = getVaultSubfolders(config.vaultPath)
            for (const sub of subfolders) {
              const subContents = readFolderContents(sub)
              if (subContents.some((f) => f.name === "OctoCode")) {
                syncSessionToFolder(session, sub)
              }
            }
            // Sync to user-specified subfolders
            for (const subfolder of config.subfolders || []) {
              const subPath = path.join(config.vaultPath, subfolder)
              if (fs.existsSync(subPath)) {
                ensureOctoFolder(subPath)
                syncSessionToFolder(session, subPath)
              }
            }
          }
        }
      }
    }, 30000)
  })

  onCleanup(() => {
    if (syncTimer) clearInterval(syncTimer)
  })

  // Periodic brain refresh - catches any missed session updates
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  createEffect(() => {
    refreshTimer = setInterval(() => {
      const brain = loadBrain()
      const currentSessions = brainData()?.sessions.length || 0
      if (brain.sessions.length !== currentSessions) {
        setBrainData(brain)
        refreshGraph(brain)
        const brainStats = getBrainStats(brain)
        setStats({
          sessions: brainStats.totalSessions,
          files: brainStats.totalFiles,
          projects: brainStats.totalProjects,
        })
      }
    }, 5000)
  })

  onCleanup(() => {
    if (refreshTimer) clearInterval(refreshTimer)
  })

  function getNodeColor(type: string): string {
    return OBSIDIAN_COLORS.node[type as keyof typeof OBSIDIAN_COLORS.node] || OBSIDIAN_COLORS.node.unresolved
  }

  function refreshGraph(brain: BrainData) {
    const brainGraph = buildBrainGraph(brain)

    const centerX = graphWidth() / 2
    const centerY = graphHeight() / 2

    // Only show session nodes
    const sessionNodes = brainGraph.nodes.filter((n) => n.type === "session")
    const sessionIds = new Set(sessionNodes.map((n) => n.id))

    // Only keep edges between sessions
    const sessionEdges = brainGraph.edges.filter(
      (e) => sessionIds.has(e.source) && sessionIds.has(e.target)
    )

    const nodes: GraphNode[] = sessionNodes.map((n) => ({
      id: n.id,
      label: n.label,
      x: centerX + (Math.random() - 0.5) * graphWidth() * 0.6,
      y: centerY + (Math.random() - 0.5) * graphHeight() * 0.6,
      vx: 0,
      vy: 0,
      mass: 0.5 + n.size * 0.15,
      color: getNodeColor(n.type),
      connections: sessionEdges.filter((e) => e.source === n.id || e.target === n.id).length,
      type: n.type as "file" | "session" | "project" | "concept",
      size: n.size,
    }))

    const edges: GraphEdge[] = sessionEdges.map((e) => ({
      source: e.source,
      target: e.target,
    }))

    if (nodes.length === 0) {
      const placeholders = [
        "No sessions yet", "Start coding", "Your projects", "Recent files",
        "Work in progress", "Completed tasks", "Ideas", "Notes",
      ]
      for (const name of placeholders) {
        nodes.push({
          id: `placeholder-${name}`,
          label: name,
          x: 10 + Math.random() * (graphWidth() - 20),
          y: 3 + Math.random() * (graphHeight() - 6),
          vx: 0,
          vy: 0,
          mass: 1,
          color: OBSIDIAN_COLORS.node.concept,
          connections: 0,
          type: "concept",
          size: 1,
        })
      }
    }

    const layouted = createForceLayout(nodes, edges, graphWidth(), graphHeight())
    setGraphData({ nodes: layouted, edges })

    setStats({
      sessions: brain.sessions.length,
      files: Object.keys(brain.files).length,
      projects: Object.keys(brain.projects).length,
    })
  }

  // Animation loop - very subtle organic motion
  let animationTimer: ReturnType<typeof setInterval> | null = null

  createEffect(() => {
    if (isAnimating()) {
      animationTimer = setInterval(() => {
        setAnimationFrame((f) => f + 1)
        const data = graphData()
        if (!data) return

        // Very gentle drift to keep the globe alive
        for (const node of data.nodes) {
          node.vx += (Math.random() - 0.5) * 0.02
          node.vy += (Math.random() - 0.5) * 0.02
          node.vx *= 0.95
          node.vy *= 0.95
          node.x += node.vx * 0.01
          node.y += node.vy * 0.01
          node.x = Math.max(2, Math.min(graphWidth() - 3, node.x))
          node.y = Math.max(1, Math.min(graphHeight() - 2, node.y))
        }
      }, 200)
    } else if (animationTimer) {
      clearInterval(animationTimer)
      animationTimer = null
    }
  })

  onCleanup(() => {
    if (animationTimer) clearInterval(animationTimer)
  })

  function toTerminal(x: number, y: number): { col: number; row: number } {
    const z = zoom()
    const px = panX()
    const py = panY()
    return {
      col: Math.round((x + px) * z),
      row: Math.round((y + py) * z),
    }
  }

  const graphBuffer = createMemo(() => {
    const data = graphData()
    if (!data) return ""
    const w = graphWidth()
    const h = graphHeight()
    if (w <= 0 || h <= 0) return ""
    const _ = animationFrame()
    const z = zoom()
    const sel = selectedNode()
    const hov = hoveredNode()

    const canvas: string[][] = Array.from({ length: h }, () => Array(w).fill(" "))

    // Draw edges only when highlighted (selected/hovered node)
    for (const edge of data.edges) {
      const source = data.nodes.find((n) => n.id === edge.source)
      const target = data.nodes.find((n) => n.id === edge.target)
      if (!source || !target) continue

      const isConnected = sel && (edge.source === sel.id || edge.target === sel.id)
      const isHovConn = hov && (edge.source === hov.id || edge.target === hov.id)
      if (!isConnected && !isHovConn) continue

      const s = toTerminal(source.x, source.y)
      const t = toTerminal(target.x, target.y)

      const dx = t.col - s.col
      const dy = t.row - s.row
      const steps = Math.max(Math.abs(dx), Math.abs(dy), 1)

      for (let i = 0; i <= steps; i++) {
        const col = Math.round(s.col + (dx * i) / steps)
        const row = Math.round(s.row + (dy * i) / steps)
        if (row >= 0 && row < h && col >= 0 && col < w) {
          if (canvas[row][col] === " ") {
            canvas[row][col] = "─"
          }
        }
      }
    }

    // Draw nodes (Obsidian-style circles using filled characters)
    for (const node of data.nodes) {
      const pos = toTerminal(node.x, node.y)
      if (pos.row < 0 || pos.row >= h || pos.col < 0 || pos.col >= w) continue
      if (!canvas[pos.row]) continue

      const isSelected = sel?.id === node.id
      const isHovered = hov?.id === node.id
      const isConnectedToSelected = sel && data.edges.some(
        (e) => (e.source === sel.id && e.target === node.id) ||
               (e.target === sel.id && e.source === node.id)
      )

      // Determine node character based on connections and state (like Obsidian sizing)
      let nodeChar = "·"
      if (isSelected || isHovered) {
        nodeChar = "◉"
      } else if (node.connections > 10) {
        nodeChar = "●"
      } else if (node.connections > 5) {
        nodeChar = "●"
      } else if (node.connections > 2) {
        nodeChar = "○"
      } else {
        nodeChar = "·"
      }

      canvas[pos.row][pos.col] = nodeChar

      // Show labels when zoomed in enough or node is selected/hovered
      const shouldShowLabel = showLabels() && (
        z >= 2 ||
        isSelected || isHovered || isConnectedToSelected ||
        (z >= 0.8 && node.connections > 3)
      )
      if (shouldShowLabel) {
        const label = node.label.slice(0, 15)
        const labelCol = pos.col + 2
        for (let i = 0; i < label.length; i++) {
          const lCol = labelCol + i
          if (lCol < w && pos.row >= 0 && pos.row < h) {
            canvas[pos.row][lCol] = label[i]
          }
        }
      }
    }

    return canvas.map((row) => row.join("")).join("\n")
  })

  const nodeLabels = createMemo(() => {
    const data = graphData()
    if (!data) return []
    return data.nodes
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 50)
      .map((node) => ({
        ...node,
        isSelected: selectedNode()?.id === node.id,
        isHovered: hoveredNode()?.id === node.id,
      }))
  })

  return (
    <box flexDirection="column" flexGrow={1} height={dimensions().height}>
      {/* Header */}
      <box flexDirection="row" justifyContent="space-between" alignItems="center" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
        <text fg={OBSIDIAN_COLORS.hover} attributes={TextAttributes.BOLD} onMouseUp={() => dialog.clear()}>← Back</text>
        <box flexDirection="row" gap={2} alignItems="center">
          <text fg={OBSIDIAN_COLORS.label} attributes={TextAttributes.BOLD}>Brain Map</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>·</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>{stats().sessions} sessions</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>·</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>{stats().files} files</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>·</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>{stats().projects} projects</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>·</text>
          <text fg={syncStatus() === "syncing" ? OBSIDIAN_COLORS.node.concept : syncStatus() === "synced" ? OBSIDIAN_COLORS.node.file : OBSIDIAN_COLORS.labelMuted}>
            {syncStatus() === "syncing" ? "⟳ Syncing" : syncStatus() === "synced" ? "✓ Synced" : "○ Live"}
          </text>
        </box>
        <box flexDirection="row" gap={2}>
          <text
            fg={vaultPath() ? OBSIDIAN_COLORS.node.file : OBSIDIAN_COLORS.node.concept}
            onMouseUp={() => setShowVaultDialog(true)}
          >
            {vaultPath() ? "✓ Vault" : "⚠ Vault"}
          </text>
          <text
            fg={isAnimating() ? OBSIDIAN_COLORS.hover : OBSIDIAN_COLORS.labelMuted}
            onMouseUp={() => setIsAnimating(!isAnimating())}
          >
            {isAnimating() ? "⏸ Pause" : "▶ Play"}
          </text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>+/- zoom</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>0 reset</text>
          <text fg={OBSIDIAN_COLORS.labelMuted}>l labels</text>
        </box>
      </box>

      {/* Vault Path Modal */}
      <Show when={showVaultDialog()}>
        <VaultPathModal
          currentPath={vaultPath()}
          onConfirm={(newPath) => {
            setVaultPath(newPath)
            setShowVaultDialog(false)
            toast.show({ message: "Vault path updated!", variant: "success" })
          }}
          onCancel={() => setShowVaultDialog(false)}
        />
      </Show>

      {/* Session Detail Dialog */}
      <Show when={showSessionDetail()}>
        {(detail) => (
          <SessionDetailDialog
            sessionId={detail().id}
            sessionLabel={detail().label}
            onClose={() => setShowSessionDetail(null)}
          />
        )}
      </Show>

      {/* Graph Canvas */}
      <box flexDirection="row" flexGrow={1} minHeight={0} paddingLeft={1} paddingRight={1}>
        {/* Main graph area - Obsidian dark background */}
        <box
          flexDirection="column"
          flexGrow={1}
          border={["top", "bottom", "left", "right"]}
          borderColor={OBSIDIAN_COLORS.edge}
          backgroundColor={OBSIDIAN_COLORS.background}
          position="relative"
          zIndex={4000}
          onMouseScroll={(evt: { scroll?: { direction: string } }) => {
            if (!evt.scroll) return
            if (evt.scroll.direction === "up") {
              setZoom((z) => Math.min(z * 1.15, 5))
            } else if (evt.scroll.direction === "down") {
              setZoom((z) => Math.max(z / 1.15, 0.3))
            }
          }}
          onMouseDown={(evt: { x: number; y: number }) => {
            lastDragX = evt.x
            lastDragY = evt.y
            clickStartX = evt.x
            clickStartY = evt.y
          }}
          onMouseUp={(evt: { x: number; y: number; stopPropagation(): void }) => {
            evt.stopPropagation()
            // Detect click (no significant drag)
            const dx = Math.abs(evt.x - clickStartX)
            const dy = Math.abs(evt.y - clickStartY)
            if (dx <= 1 && dy <= 1) {
              // Find nearest node to click position
              const data = graphData()
              if (!data) return
              const z = zoom()
              const px = panX()
              const py = panY()
              let closest: GraphNode | null = null
              let closestDist = Infinity
              for (const node of data.nodes) {
                const col = Math.round((node.x + px) * z)
                const row = Math.round((node.y + py) * z)
                const dist = Math.abs(col - evt.x) + Math.abs(row - evt.y)
                if (dist < closestDist && dist <= 3) {
                  closestDist = dist
                  closest = node
                }
              }
              if (closest && closest.type === "session") {
                setShowSessionDetail({ id: closest.id.replace("session-", ""), label: closest.label })
              } else if (closest) {
                setSelectedNode(closest)
              }
            }
          }}
          onMouseDrag={(evt: { x: number; y: number }) => {
            const dx = evt.x - lastDragX
            const dy = evt.y - lastDragY
            setPanX((p) => p + dx)
            setPanY((p) => p + dy)
            lastDragX = evt.x
            lastDragY = evt.y
          }}
        >
          <text fg={OBSIDIAN_COLORS.label} wrapMode="none" selectable={false}>
            {graphBuffer()}
          </text>
        </box>

        {/* Node labels sidebar */}
        <box flexDirection="column" width={22} paddingLeft={1}>
          <text fg={OBSIDIAN_COLORS.labelMuted} attributes={TextAttributes.BOLD}>Nodes ({nodeLabels().length})</text>
          <box flexDirection="column" gap={0} overflow="hidden">
            <For each={nodeLabels().slice(0, dimensions().height - 12)}>
              {(node) => (
                <text
                  fg={node.isSelected ? OBSIDIAN_COLORS.selected : node.isHovered ? OBSIDIAN_COLORS.hover : node.color}
                  attributes={node.isSelected ? TextAttributes.BOLD : undefined}
                  onMouseUp={() => setSelectedNode(node)}
                  onMouseOver={() => setHoveredNode(node)}
                  onMouseOut={() => setHoveredNode(null)}
                >
                  {node.isSelected ? "▸ " : "  "}{node.label.slice(0, 18)}
                </text>
              )}
            </For>
          </box>
        </box>
      </box>

      {/* Selected node details */}
      <Show when={selectedNode()}>
        {(node) => (
          <box flexDirection="row" gap={2} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
            <text fg={node().color} attributes={TextAttributes.BOLD}>{node().label}</text>
            <text fg={OBSIDIAN_COLORS.labelMuted}>·</text>
            <text fg={OBSIDIAN_COLORS.labelMuted}>{node().connections} connections</text>
            <text fg={OBSIDIAN_COLORS.labelMuted}>·</text>
            <text fg={OBSIDIAN_COLORS.labelMuted}>zoom: {Math.round(zoom() * 100)}%</text>
          </box>
        )}
      </Show>

      {/* Legend - Obsidian style */}
      <box flexDirection="row" gap={2} paddingLeft={2} paddingRight={2} paddingBottom={1}>
        <text fg={OBSIDIAN_COLORS.node.file}>● File</text>
        <text fg={OBSIDIAN_COLORS.node.session}>● Session</text>
        <text fg={OBSIDIAN_COLORS.node.project}>● Project</text>
        <text fg={OBSIDIAN_COLORS.node.concept}>● Concept</text>
        <text fg={OBSIDIAN_COLORS.labelMuted}>· Connection</text>
        <text fg={OBSIDIAN_COLORS.selected}>◉ Selected</text>
      </box>
    </box>
  )
}

// Main Dialog Component
export function DialogObsidianGraph() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const toast = useToast()

  dialog.setSize("fullscreen")

  const [view, setView] = createSignal<"setup" | "graph">("setup")

  onMount(() => {
    const config = loadObsidianConfig()
    if (config && config.connected && config.apiKey) {
      setView("graph")
    }
  })

  function handleSetupComplete() {
    setView("graph")
    toast.show({ message: "Obsidian connected! Enjoy your knowledge graph.", variant: "success" })
  }

  function handleBack() {
    dialog.clear()
  }

  return (
    <box flexDirection="column" flexGrow={1} height={dimensions().height}>
      <Show when={view() === "setup"} fallback={<GraphView />}>
        <ApiKeySetup onComplete={handleSetupComplete} onBack={handleBack} />
      </Show>
    </box>
  )
}
