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
  getBrainStats,
  type BrainData,
} from "../util/brain"

const OBSIDIAN_HELP_URL = "https://forum.obsidian.md/t/how-to-find-find-your-api-key-in-your-obsidian/64505/2"

interface ObsidianConfig {
  apiKey: string
  host: string
  port: string
  connected: boolean
}

function getConfigPath(): string {
  const dataDir = path.join(os.homedir(), ".local", "share", "octo")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return path.join(dataDir, "obsidian-config.json")
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
}

interface GraphEdge {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const REPULSION = 800
const ATTRACTION = 0.005
const DAMPING = 0.85
const CENTER_GRAVITY = 0.01
const MIN_DISTANCE = 3
const MAX_ITERATIONS = 100

function createForceLayout(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number): GraphNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DISTANCE)
        const force = REPULSION / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx / a.mass
        a.vy -= fy / a.mass
        b.vx += fx / b.mass
        b.vy += fy / b.mass
      }
    }

    for (const edge of edges) {
      const a = nodeMap.get(edge.source)
      const b = nodeMap.get(edge.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const force = dist * ATTRACTION
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx += fx / a.mass
      a.vy += fy / a.mass
      b.vx -= fx / b.mass
      b.vy -= fy / b.mass
    }

    const cx = width / 2
    const cy = height / 2
    for (const node of nodes) {
      node.vx += (cx - node.x) * CENTER_GRAVITY
      node.vy += (cy - node.y) * CENTER_GRAVITY
    }

    for (const node of nodes) {
      node.vx *= DAMPING
      node.vy *= DAMPING
      node.x += node.vx
      node.y += node.vy
      node.x = Math.max(2, Math.min(width - 3, node.x))
      node.y = Math.max(1, Math.min(height - 2, node.y))
    }
  }

  return nodes
}

function generateMockGraph(): GraphData {
  const notes = [
    "Daily Notes", "Projects", "Ideas", "Research", "Tasks",
    "Meetings", "Goals", "Reading", "Journal", "Work",
    "Health", "Finance", "Learning", "Travel", "Recipes",
    "Books", "Movies", "Music", "Art", "Code",
    "Design", "Writing", "Photography", "Fitness", "Cooking",
  ]

  const nodes: GraphNode[] = notes.map((name, i) => ({
    id: `note-${i}`,
    label: name,
    x: 10 + Math.random() * 60,
    y: 3 + Math.random() * 20,
    vx: 0,
    vy: 0,
    mass: 1 + Math.random() * 0.5,
    color: ["#ff6b9d", "#c44dff", "#6e40ff", "#4dc9ff", "#4dffb8"][i % 5],
    connections: 0,
  }))

  const edges: GraphEdge[] = []
  for (let i = 0; i < nodes.length; i++) {
    const numConnections = 1 + Math.floor(Math.random() * 3)
    for (let j = 0; j < numConnections; j++) {
      const target = Math.floor(Math.random() * nodes.length)
      if (target !== i) {
        edges.push({ source: `note-${i}`, target: `note-${target}` })
        nodes[i].connections++
        nodes[target].connections++
      }
    }
  }

  return { nodes, edges }
}

// API Key Setup using DialogPrompt pattern
function ApiKeyInput(props: { onConfirm: (key: string) => void; onCancel: () => void }) {
  const { theme } = useTheme()
  const dialog = useDialog()
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

// API Key Setup Screen
function ApiKeySetup(props: { onComplete: () => void; onBack: () => void }) {
  const { theme } = useTheme()
  const toast = useToast()
  const dimensions = useTerminalDimensions()
  const [step, setStep] = createSignal<"instructions" | "apikey">("instructions")
  const [apiKey, setApiKey] = createSignal("")
  const [isConnecting, setIsConnecting] = createSignal(false)

  async function handleConnect() {
    if (!apiKey()) {
      toast.show({ message: "Please enter your API key", variant: "warning" })
      return
    }
    setIsConnecting(true)

    // Save the config to disk
    const config: ObsidianConfig = {
      apiKey: apiKey(),
      host: "localhost",
      port: "27123",
      connected: true,
    }
    saveObsidianConfig(config)

    setTimeout(() => {
      setIsConnecting(false)
      toast.show({ message: "Obsidian MCP connected and saved!", variant: "success" })
      props.onComplete()
    }, 1500)
  }

  return (
    <box flexDirection="column" flexGrow={1} height={dimensions().height}>
      {/* Header */}
      <box flexDirection="row" justifyContent="space-between" alignItems="center" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
        <text fg={theme.primary} attributes={TextAttributes.BOLD} onMouseUp={() => props.onBack()}>← Back</text>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>Obsidian Setup</text>
        <text fg={theme.primary} onMouseUp={() => open(OBSIDIAN_HELP_URL).catch(() => {})}>Help</text>
      </box>

      {/* Content */}
      <box flexDirection="column" flexGrow={1} paddingLeft={4} paddingRight={4} paddingTop={2} gap={1}>
        <Show when={step() === "instructions"} fallback={
          <ApiKeyInput
            onConfirm={(key) => {
              setApiKey(key)
              handleConnect()
            }}
            onCancel={() => setStep("instructions")}
          />
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

      {/* Footer */}
      <box flexDirection="row" justifyContent="center" paddingLeft={2} paddingRight={2} paddingBottom={1}>
        <text fg={theme.textMuted}>Your API key is stored locally and never leaves your computer</text>
      </box>
    </box>
  )
}

// Main Graph View
function GraphView() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const event = useEvent()
  const toast = useToast()
  const tuiConfig = useTuiConfig()
  const acc = createMemo(() => getScrollAcceleration(tuiConfig))
  const dimensions = useTerminalDimensions()

  const [graphData, setGraphData] = createSignal<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = createSignal<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = createSignal<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = createSignal("")
  const [isAnimating, setIsAnimating] = createSignal(true)
  const [animationFrame, setAnimationFrame] = createSignal(0)
  const [brainData, setBrainData] = createSignal<BrainData | null>(null)
  const [stats, setStats] = createSignal({ sessions: 0, files: 0, projects: 0 })
  const [syncStatus, setSyncStatus] = createSignal<"idle" | "syncing" | "synced">("idle")

  const graphWidth = createMemo(() => dimensions().width - 24)
  const graphHeight = createMemo(() => dimensions().height - 8)

  // Load brain data and track all sessions
  onMount(() => {
    let brain = loadBrain()

    // Process any pending sync queue items
    processSyncQueue()

    // Track ALL existing sessions from sync data
    const sessions = sync.data.session || []
    for (const session of sessions) {
      const files = session.summary?.diffs?.map((d) => d.file || "").filter(Boolean) || []
      brain = trackSession(brain, {
        id: session.id,
        title: session.title || "Untitled",
        files,
        summary: "",
        tokens: (session.tokens?.input || 0) + (session.tokens?.output || 0),
        project: session.directory ? path.basename(session.directory) : undefined,
      })

      // Track files
      for (const file of files) {
        brain = trackFile(brain, file, session.id)
      }

      // Track project
      if (session.directory) {
        brain = trackProject(brain, session.directory, session.id)
      }
    }

    // Merge related sessions
    brain = mergeRelatedSessions(brain)

    // Save updated brain
    saveBrain(brain)
    setBrainData(brain)

    // Build and set graph
    refreshGraph(brain)

    // Update stats
    const brainStats = getBrainStats(brain)
    setStats({
      sessions: brainStats.totalSessions,
      files: brainStats.totalFiles,
      projects: brainStats.totalProjects,
    })
  })

  // Real-time event listeners for auto-sync
  event.on("session.updated", (evt) => {
    const session = evt.properties.info
    if (!session) return

    setSyncStatus("syncing")
    const files = session.summary?.diffs?.map((d) => d.file || "").filter(Boolean) || []

    queueSync("session", {
      id: session.id,
      title: session.title || "Untitled",
      files,
      summary: "",
      tokens: (session.tokens?.input || 0) + (session.tokens?.output || 0),
      project: session.directory ? path.basename(session.directory) : undefined,
    })

    // Track files
    for (const file of files) {
      queueSync("file", { path: file, sessionId: session.id })
    }

    // Track project
    if (session.directory) {
      queueSync("project", { path: session.directory, sessionId: session.id })
    }

    // Process queue and refresh graph
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

  // Auto-sync to Obsidian vault every 30 seconds
  let syncTimer: ReturnType<typeof setInterval> | null = null
  createEffect(() => {
    syncTimer = setInterval(() => {
      const config = loadObsidianConfig()
      if (config && config.connected) {
        syncToObsidianVault(config.host)
      }
    }, 30000)
  })

  onCleanup(() => {
    if (syncTimer) clearInterval(syncTimer)
  })

  function refreshGraph(brain: BrainData) {
    const brainGraph = buildBrainGraph(brain)

    const nodes: GraphNode[] = brainGraph.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      x: 10 + Math.random() * (graphWidth() - 20),
      y: 3 + Math.random() * (graphHeight() - 6),
      vx: 0,
      vy: 0,
      mass: 0.5 + n.size * 0.1,
      color: n.type === "project" ? "#ff6b9d" :
             n.type === "file" ? "#c44dff" :
             n.type === "session" ? "#6e40ff" :
             "#4dc9ff",
      connections: brainGraph.edges.filter((e) => e.source === n.id || e.target === n.id).length,
    }))

    const edges: GraphEdge[] = brainGraph.edges.map((e) => ({
      source: e.source,
      target: e.target,
    }))

    // If no brain data yet, generate some placeholder nodes
    if (nodes.length === 0) {
      const placeholderNotes = [
        "No sessions yet", "Start coding", "Your projects", "Recent files",
        "Work in progress", "Completed tasks", "Ideas", "Notes",
      ]
      for (const name of placeholderNotes) {
        nodes.push({
          id: `placeholder-${name}`,
          label: name,
          x: 10 + Math.random() * (graphWidth() - 20),
          y: 3 + Math.random() * (graphHeight() - 6),
          vx: 0,
          vy: 0,
          mass: 1,
          color: "#4dffb8",
          connections: 0,
        })
      }
    }

    const layouted = createForceLayout(nodes, edges, graphWidth(), graphHeight())
    setGraphData({ nodes: layouted, edges })

    // Update stats
    setStats({
      sessions: brain.sessions.length,
      files: Object.keys(brain.files).length,
      projects: Object.keys(brain.projects).length,
    })
  }

  let animationTimer: ReturnType<typeof setInterval> | null = null

  createEffect(() => {
    if (isAnimating()) {
      animationTimer = setInterval(() => {
        setAnimationFrame((f) => f + 1)
        const data = graphData()
        if (!data) return

        for (const node of data.nodes) {
          node.vx += (Math.random() - 0.5) * 0.3
          node.vy += (Math.random() - 0.5) * 0.3
          node.vx *= 0.95
          node.vy *= 0.95
          node.x += node.vx * 0.1
          node.y += node.vy * 0.1
          node.x = Math.max(2, Math.min(graphWidth() - 3, node.x))
          node.y = Math.max(1, Math.min(graphHeight() - 2, node.y))
        }
      }, 100)
    } else if (animationTimer) {
      clearInterval(animationTimer)
      animationTimer = null
    }
  })

  onCleanup(() => {
    if (animationTimer) clearInterval(animationTimer)
  })

  const filteredNodes = createMemo(() => {
    const data = graphData()
    if (!data) return []
    const q = searchQuery().toLowerCase()
    if (!q) return data.nodes
    return data.nodes.filter((n) => n.label.toLowerCase().includes(q))
  })

  function toTerminal(x: number, y: number): { col: number; row: number } {
    return {
      col: Math.round(x),
      row: Math.round(y),
    }
  }

  const graphBuffer = createMemo(() => {
    const data = graphData()
    if (!data) return ""
    const w = graphWidth()
    const h = graphHeight()
    const _ = animationFrame()

    const canvas: string[][] = Array.from({ length: h }, () => Array(w).fill(" "))

    for (const edge of data.edges) {
      const source = data.nodes.find((n) => n.id === edge.source)
      const target = data.nodes.find((n) => n.id === edge.target)
      if (!source || !target) continue

      const s = toTerminal(source.x, source.y)
      const t = toTerminal(target.x, target.y)

      const dx = t.col - s.col
      const dy = t.row - s.row
      const steps = Math.max(Math.abs(dx), Math.abs(dy))
      for (let i = 0; i <= steps; i++) {
        const col = Math.round(s.col + (dx * i) / steps)
        const row = Math.round(s.row + (dy * i) / steps)
        if (row >= 0 && row < h && col >= 0 && col < w) {
          if (canvas[row][col] === " ") {
            canvas[row][col] = "·"
          }
        }
      }
    }

    for (const node of data.nodes) {
      const pos = toTerminal(node.x, node.y)
      if (pos.row >= 0 && pos.row < h && pos.col >= 0 && pos.col < w) {
        const isSelected = selectedNode()?.id === node.id
        const isHovered = hoveredNode()?.id === node.id
        if (isSelected || isHovered) {
          canvas[pos.row][pos.col] = "●"
        } else if (node.connections > 3) {
          canvas[pos.row][pos.col] = "◆"
        } else if (node.connections > 1) {
          canvas[pos.row][pos.col] = "■"
        } else {
          canvas[pos.row][pos.col] = "○"
        }
      }
    }

    return canvas.map((row) => row.join("")).join("\n")
  })

  const nodeLabels = createMemo(() => {
    const data = graphData()
    if (!data) return []
    const filtered = filteredNodes()
    return filtered.map((node) => {
      const pos = toTerminal(node.x, node.y)
      return {
        ...node,
        terminalX: pos.col,
        terminalY: pos.row,
        isSelected: selectedNode()?.id === node.id,
        isHovered: hoveredNode()?.id === node.id,
      }
    })
  })

  return (
    <box flexDirection="column" flexGrow={1} height={dimensions().height}>
      {/* Header */}
      <box flexDirection="row" justifyContent="space-between" alignItems="center" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
        <text fg={theme.primary} attributes={TextAttributes.BOLD} onMouseUp={() => dialog.clear()}>← Back</text>
        <box flexDirection="row" gap={2} alignItems="center">
          <text fg={theme.text} attributes={TextAttributes.BOLD}>Brain Map</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.textMuted}>{stats().sessions} sessions</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.textMuted}>{stats().files} files</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.textMuted}>{stats().projects} projects</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={syncStatus() === "syncing" ? theme.warning : syncStatus() === "synced" ? theme.success : theme.textMuted}>
            {syncStatus() === "syncing" ? "⟳ Syncing" : syncStatus() === "synced" ? "✓ Synced" : "○ Live"}
          </text>
        </box>
        <box flexDirection="row" gap={2}>
          <text
            fg={isAnimating() ? theme.primary : theme.textMuted}
            onMouseUp={() => setIsAnimating(!isAnimating())}
          >
            {isAnimating() ? "⏸ Pause" : "▶ Play"}
          </text>
          <text fg={theme.primary} onMouseUp={() => open(OBSIDIAN_HELP_URL).catch(() => {})}>Help</text>
        </box>
      </box>

      {/* Graph Canvas */}
      <box flexDirection="row" flexGrow={1} minHeight={0} paddingLeft={2} paddingRight={2}>
        {/* Main graph area */}
        <box
          flexDirection="column"
          flexGrow={1}
          border={["top", "bottom", "left", "right"]}
          borderColor={theme.border}
          backgroundColor={theme.background}
        >
          <text fg={theme.text} wrapMode="none">
            {graphBuffer()}
          </text>
        </box>

        {/* Node labels sidebar */}
        <box flexDirection="column" width={20} paddingLeft={1}>
          <text fg={theme.textMuted} attributes={TextAttributes.BOLD}>Nodes ({filteredNodes().length})</text>
          <box flexDirection="column" gap={0} overflow="hidden">
            <For each={nodeLabels().slice(0, dimensions().height - 14)}>
              {(node) => (
                <text
                  fg={node.isSelected ? theme.primary : node.isHovered ? theme.accent : theme.textMuted}
                  attributes={node.isSelected ? TextAttributes.BOLD : undefined}
                  onMouseUp={() => setSelectedNode(node)}
                  onMouseOver={() => setHoveredNode(node)}
                  onMouseOut={() => setHoveredNode(null)}
                >
                  {node.isSelected ? "▸ " : "  "}{node.label}
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
            <text fg={theme.primary} attributes={TextAttributes.BOLD}>{node().label}</text>
            <text fg={theme.textMuted}>·</text>
            <text fg={theme.textMuted}>{node().connections} connections</text>
          </box>
        )}
      </Show>

      {/* Legend */}
      <box flexDirection="row" gap={2} paddingLeft={2} paddingRight={2} paddingBottom={1}>
        <text fg="#ff6b9d">● Project</text>
        <text fg="#c44dff">● File</text>
        <text fg="#6e40ff">● Session</text>
        <text fg="#4dc9ff">● Concept</text>
        <text fg={theme.textMuted}>· Connection</text>
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

  // Check if Obsidian is already configured on mount
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
