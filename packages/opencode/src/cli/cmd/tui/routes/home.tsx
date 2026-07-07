import { TextAttributes } from "@opentui/core"
import { Prompt, type PromptRef } from "@/cli/cmd/tui/component/prompt"
import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import { useSync } from "@/cli/cmd/tui/context/sync"
import { Toast } from "@/cli/cmd/tui/ui/toast"
import { useArgs } from "@/cli/cmd/tui/context/args"
import { useRouteData, useRoute } from "@/cli/cmd/tui/context/route"
import { usePromptRef } from "@/cli/cmd/tui/context/prompt"
import { useLocal } from "@/cli/cmd/tui/context/local"
import { useKV } from "@/cli/cmd/tui/context/kv"
import { useLanguage } from "@/cli/cmd/tui/context/language"
import { TuiPluginRuntime } from "@/cli/cmd/tui/plugin"
import { Global } from "@/global"
import { useTheme } from "@/cli/cmd/tui/context/theme"
import { useDialog } from "@/cli/cmd/tui/ui/dialog"
import { DialogBrain } from "@/cli/cmd/tui/component/dialog-brain"
import { DialogSessionList } from "@/cli/cmd/tui/component/dialog-session-list"
import * as Locale from "@/util/locale"
import { useProject } from "@/cli/cmd/tui/context/project"
import { useTerminalDimensions } from "@opentui/solid"

let once = false

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
  "                               ███████████████",
  "                             ███████████████████",
  "                             ██ O███████████O ██",
  "                             ██ O███████████O ██",
  "                             ███████████████████",
  "                    ███████  ███████████████████  ███████",
  "                       ███████████████████████████████",
  "                         ███████████████████████████",
  "                      ███████ ████ ███ ███ ████ ███████",
  "                    ███████   ████ ███  ██ ████   ███████",
  "                            █████  ███  ██  █████",
  "                         ██████   ███   ███   ██████",
  "                                 ███     ███",
  "                                 ███     ███",
  "                                ██████  █████",
  "                                  ██     ██",
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
    const kind = char === "O" ? "outline" : char === "█" || char === "P" ? "fill" : "space"
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
  const themeState = useTheme()
  const isDark = createMemo(() => themeState.mode() === "dark")
  return (
    <text>
      {mascotSegments(props.line).map((segment) =>
        segment.kind === "space" ? (
          segment.text
        ) : (
          <span style={{ fg: segment.kind === "outline" ? (isDark() ? "#000000" : "#ffffff") : "#7b32b8" }}>{segment.text}</span>
        ),
      )}
    </text>
  )
}

export function NavItem(props: { icon: string; label: string; command: string }) {
  const { theme } = useTheme()
  const [hover, setHover] = createSignal(false)

  return (
    <box
      flexDirection="row"
      gap={1}
      alignItems="center"
      height={1}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <text fg={hover() ? theme.primary : theme.text} attributes={TextAttributes.BOLD} wrapMode="none">{props.icon}</text>
      <text fg={hover() ? theme.primary : theme.textMuted} wrapMode="none">
        {props.label}
      </text>
    </box>
  )
}

export function MemoryButton() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [hover, setHover] = createSignal(false)

  return (
    <box
      flexDirection="row"
      gap={1}
      alignItems="center"
      height={1}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseUp={() => {
        dialog.replace(() => <DialogBrain />)
        dialog.setSize("large")
      }}
    >
      <text fg={hover() ? theme.primary : theme.text} attributes={TextAttributes.BOLD} wrapMode="none">*</text>
      <text fg={hover() ? theme.primary : theme.textMuted} wrapMode="none">
        Brain
      </text>
    </box>
  )
}

export function Home() {
  const sync = useSync()
  const project = useProject()
  const route = useRoute()
  const routeData = useRouteData("home")
  const promptRef = usePromptRef()
  const dialog = useDialog()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const kv = useKV()
  const t = useLanguage().t
  const dimensions = useTerminalDimensions()
  const { theme } = useTheme()
  const dashboardWidth = createMemo(() => Math.max(72, Math.min(88, dimensions().width - 26)))

  const leftWidth = createMemo(() => Math.floor(dashboardWidth() * 0.65))
  const rightWidth = createMemo(() => dashboardWidth() - leftWidth() - 2)
  const user = createMemo(() => sync.data.config?.username || process.env.USERNAME || process.env.USER || "User")
  const cwd = createMemo(() => truncateMiddle(relativeCwd(), Math.max(18, leftWidth() - 4)))
  const recentSessions = createMemo(() => {
    return (sync.data.session || [])
      .filter((s: any) => !s.parentID)
      .sort((a: any, b: any) => b.time.updated - a.time.updated)
      .slice(0, 4)
  })
  const [hoveredSession, setHoveredSession] = createSignal<string | null>(null)
  const [hoveredMore, setHoveredMore] = createSignal(false)
  const [hoveredCommand, setHoveredCommand] = createSignal<string | null>(null)

  const C = {
    bg: theme.background,
    panel: theme.backgroundPanel,
    prompt: theme.backgroundElement,
    border: theme.border,
    text: theme.text,
    muted: theme.textMuted,
    dim: theme.borderSubtle,
    pink: theme.primary,
    purple: theme.accent,
    outline: theme.background,
  }

  let sent = false
  const [firstTime, setFirstTime] = createSignal(false)

  const greeting = createMemo(() => {
    return firstTime() ? "Welcome " : "Welcome back "
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
    <>
      <box flexGrow={1} backgroundColor={C.bg}>
        <box height={1} flexShrink={1} />
        <box flexDirection="row" justifyContent="space-between" alignItems="flex-start" width="100%" flexShrink={0}>
          <box paddingTop={1}>
            <box alignItems="center" marginLeft={20}>
              <text fg={C.pink} attributes={TextAttributes.BOLD}>
                OCTOCODE V4
              </text>
              <text fg={C.muted}>{greeting() + user() + "!"}</text>
            </box>
            <box marginTop={1}>
              <For each={mascot}>{(line) => <MascotLine line={line} />}</For>
            </box>
          </box>
          <box
            border={["top", "bottom", "left", "right"]}
            borderColor={C.border}
            customBorderChars={DOTTED}
            backgroundColor={C.bg}
            paddingLeft={1}
            paddingRight={1}
            marginRight={7}
          >
            <text fg={C.pink} attributes={TextAttributes.BOLD}>Recent activity</text>
            <For each={recentSessions()}>
              {(session: any) => (
                <box
                  flexDirection="row"
                  gap={1}
                  onMouseOver={() => setHoveredSession(session.id)}
                  onMouseOut={() => setHoveredSession(null)}
                  onMouseUp={() => route.navigate({ type: "session", sessionID: session.id })}
                >
                  <text fg={hoveredSession() === session.id ? C.pink : C.muted}>
                    {session.time?.updated ? Locale.relativeTime(session.time.updated) : ""}
                  </text>
                  <text fg={hoveredSession() === session.id ? C.pink : C.muted}>
                    {Locale.truncate(session.title || "", 24)}
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
              <text fg={hoveredMore() ? C.pink : C.muted} attributes={TextAttributes.BOLD}>
                more sessions →
              </text>
            </box>
            <box height={1} border={["top"]} borderColor={C.border} customBorderChars={DOTTED} />
            <text fg={C.pink} attributes={TextAttributes.BOLD}>
              What's new
            </text>
            <box
              flexDirection="row"
              gap={1}
              onMouseOver={() => setHoveredCommand("dream")}
              onMouseOut={() => setHoveredCommand(null)}
              onMouseUp={() => {
                ref()?.set({ input: "/dream", parts: [] })
              }}
            >
              <text fg={hoveredCommand() === "dream" ? C.pink : C.muted}>/dream</text>
              <text fg={C.dim}>consolidate memories</text>
            </box>
            <box
              flexDirection="row"
              gap={1}
              onMouseOver={() => setHoveredCommand("distill")}
              onMouseOut={() => setHoveredCommand(null)}
              onMouseUp={() => {
                ref()?.set({ input: "/distill", parts: [] })
              }}
            >
              <text fg={hoveredCommand() === "distill" ? C.pink : C.muted}>/distill</text>
              <text fg={C.dim}>create reusable skills</text>
            </box>
            <box
              flexDirection="row"
              gap={1}
              onMouseOver={() => setHoveredCommand("goal")}
              onMouseOut={() => setHoveredCommand(null)}
              onMouseUp={() => {
                ref()?.set({ input: "/goal", parts: [] })
              }}
            >
              <text fg={hoveredCommand() === "goal" ? C.pink : C.muted}>/goal</text>
              <text fg={C.dim}>set stopping conditions</text>
            </box>
            <box
              flexDirection="row"
              gap={1}
              onMouseOver={() => setHoveredCommand("help")}
              onMouseOut={() => setHoveredCommand(null)}
              onMouseUp={() => {
                ref()?.set({ input: "/help", parts: [] })
              }}
            >
              <text fg={hoveredCommand() === "help" ? C.pink : C.muted}>/help</text>
              <text fg={C.dim}>for more</text>
            </box>
            <box flexDirection="row" gap={2} marginTop={1}>
              <NavItem icon="@" label="Extension" command="docs.open" />
              <MemoryButton />
            </box>
          </box>
        </box>
        <box flexGrow={1} minHeight={2} />
        <box width="100%" alignItems="center" paddingBottom={1} flexShrink={0}>
          <box width="100%" zIndex={1000}>
            <TuiPluginRuntime.Slot name="home_prompt" mode="replace" workspace_id={project.workspace.current()} ref={bind}>
              <Prompt
                ref={bind}
                homeDock
                workspaceID={project.workspace.current()}
                right={<TuiPluginRuntime.Slot name="home_prompt_right" workspace_id={project.workspace.current()} />}
                placeholders={placeholder}
              />
            </TuiPluginRuntime.Slot>
          </box>
        </box>
        <Toast />
      </box>
    </>
  )
}
