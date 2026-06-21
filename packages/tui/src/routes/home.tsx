import { RGBA, TextAttributes } from "@opentui/core"
import { Prompt, type PromptRef } from "../component/prompt"
import { createEffect, createMemo, createSignal, For, onMount } from "solid-js"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRoute, useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { usePluginRuntime } from "../plugin/runtime"
import { useEditorContext } from "../context/editor"
import { useTerminalDimensions } from "@opentui/solid"
import { HomeSessionDestinationProvider } from "./home/session-destination"
import { useOctocodeKeymap } from "../keymap"
import { useDialog } from "../ui/dialog"
import { DialogObsidianGraph } from "../component/dialog-obsidian-graph"
import { DialogSessionList } from "../component/dialog-session-list"
import { Locale } from "../util/locale"

let once = false

const C = {
  bg: RGBA.fromHex("#050505"),
  panel: RGBA.fromHex("#101012"),
  prompt: RGBA.fromHex("#242528"),
  border: RGBA.fromHex("#40363a"),
  text: RGBA.fromHex("#f1eeee"),
  muted: RGBA.fromHex("#8f8586"),
  dim: RGBA.fromHex("#676165"),
  pink: RGBA.fromHex("#a45c75"),
  purple: RGBA.fromHex("#7b32b8"),
  outline: RGBA.fromHex("#050505"),
  icon: RGBA.fromHex("#27282b"),
  iconHover: RGBA.fromHex("#34363a"),
}

const DOTTED = {
  topLeft: ".",
  bottomLeft: ".",
  vertical: ":",
  topRight: ".",
  bottomRight: ".",
  horizontal: ".",
  bottomT: ".",
  topT: ".",
  cross: ".",
  leftT: ".",
  rightT: ".",
}

const placeholder = {
  normal: ['Type "/" to quickly access skills'],
  shell: ["ls -la", "git status", "pwd"],
}

const mascot = [
  "     /-\\     ",
  "    /   \\    ",
  "   | ^ ^ |   ",
  " --|  _  |-- ",
  "  /|\\___/|\\  ",
  " / | |_| | \\ ",
  "   |  |  |   ",
]

function relativeCwd() {
  const home = process.env.USERPROFILE || process.env.HOME || ""
  return process.cwd().replace(home, "~").replace(/\\/g, "/")
}

function truncateMiddle(value: string, max: number) {
  if (value.length <= max) return value
  if (max <= 3) return value.slice(0, max)
  const keep = max - 3
  const left = Math.ceil(keep / 2)
  const right = Math.floor(keep / 2)
  return `${value.slice(0, left)}...${value.slice(value.length - right)}`
}

function mascotSegments(line: string) {
  const result: Array<{ kind: "outline" | "fill" | "space"; text: string }> = []
  for (const char of line) {
    const kind = char === "O" ? "outline" : char === "P" ? "fill" : "space"
    const text = kind === "space" ? " " : "█"
    const last = result.at(-1)
    if (last?.kind === kind) {
      last.text += text
      continue
    }
    result.push({ kind, text })
  }
  return result
}

function MascotLine(props: { line: string }) {
  return (
    <text>
      {mascotSegments(props.line).map((segment) =>
        segment.kind === "space" ? (
          segment.text
        ) : (
          <span style={{ fg: segment.kind === "outline" ? C.outline : C.purple }}>{segment.text}</span>
        ),
      )}
    </text>
  )
}

function NavItem(props: { icon: string; label: string; command: string }) {
  const keymap = useOctocodeKeymap()
  const [hover, setHover] = createSignal(false)

  return (
    <box
      flexDirection="row"
      gap={1}
      alignItems="center"
      height={1}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseUp={() => keymap.dispatchCommand(props.command)}
    >
      <text fg={hover() ? C.pink : C.text} attributes={TextAttributes.BOLD} wrapMode="none">{props.icon}</text>
      <text fg={hover() ? C.pink : C.muted} wrapMode="none">
        {props.label}
      </text>
    </box>
  )
}

function MemoryButton() {
  const dialog = useDialog()
  const [hover, setHover] = createSignal(false)

  return (
    <box
      flexDirection="row"
      gap={1}
      alignItems="center"
      height={1}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseUp={() => dialog.replace(() => <DialogObsidianGraph />)}
    >
      <text fg={hover() ? C.pink : C.text} attributes={TextAttributes.BOLD} wrapMode="none">*</text>
      <text fg={hover() ? C.pink : C.muted} wrapMode="none">
        Brain
      </text>
    </box>
  )
}

export function Home() {
  const pluginRuntime = usePluginRuntime()
  const sync = useSync()
  const route = useRoute()
  const routeData = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  const dialog = useDialog()
  const dimensions = useTerminalDimensions()
  const dashboardWidth = createMemo(() => Math.max(72, Math.min(88, dimensions().width - 26)))

  const leftWidth = createMemo(() => Math.floor(dashboardWidth() * 0.44))
  const rightWidth = createMemo(() => dashboardWidth() - leftWidth() - 2)
  const showNav = createMemo(() => dimensions().width >= 84)
  const user = createMemo(() => process.env.USERNAME || process.env.USER || "Farhan")
  const cwd = createMemo(() => truncateMiddle(relativeCwd(), Math.max(18, leftWidth() - 4)))
  const recentSessions = createMemo(() => {
    return sync.data.session
      .filter((s) => !s.parentID)
      .sort((a, b) => b.time.updated - a.time.updated)
      .slice(0, 4)
  })
  const [hoveredSession, setHoveredSession] = createSignal<string | null>(null)
  const [hoveredMore, setHoveredMore] = createSignal(false)
  const [hoveredCmd, setHoveredCmd] = createSignal<string | null>(null)
  let sent = false

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (routeData.prompt) {
      r.set(routeData.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <HomeSessionDestinationProvider>
      <box flexGrow={1} backgroundColor={C.bg}>
        <box height={1} flexShrink={1} />
        <box flexDirection="row" justifyContent="center" gap={2} width="100%" flexShrink={0}>
          <box
            width={dashboardWidth()}
            height={14}
            border={["top", "bottom", "left", "right"]}
            borderColor={C.border}
            customBorderChars={DOTTED}
            backgroundColor={C.bg}
            flexDirection="row"
          >
            <box width={leftWidth()} border={["right"]} borderColor={C.border} customBorderChars={DOTTED}>
              <box alignItems="center" height={3} paddingTop={1}>
                <text fg={C.pink} attributes={TextAttributes.BOLD}>
                  octo code v1
                </text>
                <text fg={C.muted}>{"Welcome back " + user() + "!"}</text>
              </box>
              <box height={1} />
              <box alignItems="center">
                <For each={mascot}>{(line) => <text fg={C.purple}>{line}</text>}</For>
              </box>
              <box flexGrow={1} />
            </box>
            <box width={rightWidth()} paddingLeft={1} paddingRight={1}>
              <box height={6}>
                <text fg={C.muted}>Recent activity</text>
                <For each={recentSessions()}>
                  {(session) => (
                    <box
                      flexDirection="row"
                      gap={1}
                      onMouseOver={() => setHoveredSession(session.id)}
                      onMouseOut={() => setHoveredSession(null)}
                      onMouseUp={() => route.navigate({ type: "session", sessionID: session.id })}
                    >
                      <text fg={hoveredSession() === session.id ? C.pink : C.muted}>
                        {Locale.relativeTime(session.time.updated)}
                      </text>
                      <text fg={hoveredSession() === session.id ? C.text : C.muted}>
                        {Locale.truncate(session.title, 24)}
                      </text>
                    </box>
                  )}
                </For>
                <box
                  flexDirection="row"
                  gap={1}
                  onMouseOver={() => setHoveredMore(true)}
                  onMouseOut={() => setHoveredMore(false)}
                  onMouseUp={() => dialog.replace(() => <DialogSessionList />)}
                >
                  <text fg={hoveredMore() ? C.text : C.pink} attributes={TextAttributes.BOLD}>
                    more sessions →
                  </text>
                </box>
              </box>
              <box height={1} border={["top"]} borderColor={C.border} customBorderChars={DOTTED} />
              <box>
                <text fg={C.pink} attributes={TextAttributes.BOLD}>
                  What's new
                </text>
                <box
                  flexDirection="row"
                  gap={1}
                  onMouseOver={() => setHoveredCmd("dream")}
                  onMouseOut={() => setHoveredCmd(null)}
                  onMouseUp={() => {
                    ref()?.set({ input: "/dream", parts: [] })
                    ref()?.submit()
                  }}
                >
                  <text fg={hoveredCmd() === "dream" ? C.pink : C.muted}>/dream</text>
                  <text fg={hoveredCmd() === "dream" ? C.text : C.dim}>consolidate memories</text>
                </box>
                <box
                  flexDirection="row"
                  gap={1}
                  onMouseOver={() => setHoveredCmd("distill")}
                  onMouseOut={() => setHoveredCmd(null)}
                  onMouseUp={() => {
                    ref()?.set({ input: "/distill", parts: [] })
                    ref()?.submit()
                  }}
                >
                  <text fg={hoveredCmd() === "distill" ? C.pink : C.muted}>/distill</text>
                  <text fg={hoveredCmd() === "distill" ? C.text : C.dim}>create reusable skills</text>
                </box>
                <box
                  flexDirection="row"
                  gap={1}
                  onMouseOver={() => setHoveredCmd("goal")}
                  onMouseOut={() => setHoveredCmd(null)}
                  onMouseUp={() => {
                    ref()?.set({ input: "/goal", parts: [] })
                    ref()?.submit()
                  }}
                >
                  <text fg={hoveredCmd() === "goal" ? C.pink : C.muted}>/goal</text>
                  <text fg={hoveredCmd() === "goal" ? C.text : C.dim}>set stopping conditions</text>
                </box>
                <box
                  flexDirection="row"
                  gap={1}
                  onMouseOver={() => setHoveredCmd("help")}
                  onMouseOut={() => setHoveredCmd(null)}
                  onMouseUp={() => {
                    ref()?.set({ input: "/help", parts: [] })
                    ref()?.submit()
                  }}
                >
                  <text fg={hoveredCmd() === "help" ? C.pink : C.muted}>/help</text>
                  <text fg={hoveredCmd() === "help" ? C.text : C.dim}>for more</text>
                </box>
              </box>
            </box>
          </box>
          <box width={showNav() ? 18 : 0} visible={showNav()} paddingTop={1}>
            <NavItem icon="@" label="Browser" command="docs.open" />
            <MemoryButton />
          </box>
        </box>
        <box flexGrow={1} minHeight={2} />
        <box width="100%" alignItems="center" paddingBottom={1} flexShrink={0}>
          <box width="100%" zIndex={1000}>
            <pluginRuntime.Slot name="home_prompt" mode="replace" ref={bind}>
              <Prompt
                ref={bind}
                homeDock
                right={<pluginRuntime.Slot name="home_prompt_right" />}
                placeholders={placeholder}
              />
            </pluginRuntime.Slot>
          </box>
        </box>
        <Toast />
      </box>
    </HomeSessionDestinationProvider>
  )
}
