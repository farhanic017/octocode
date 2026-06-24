import { TextAttributes } from "@opentui/core"
import { createEffect, createMemo, createSignal, For, on, onMount, Show } from "solid-js"
import { useTheme } from "../context/theme"
import { useKV } from "../context/kv"
import { useSDK } from "../context/sdk"
import { useSync } from "../context/sync"
import { useRoute } from "../context/route"
import { useDialog } from "../ui/dialog"
import { DialogProvider } from "../component/dialog-provider"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Spinner } from "../component/spinner"

const WELCOME_THEMES = ["octo", "octocode-dark", "octocode-light"]

export type WelcomeStep = "theme" | "provider" | "name" | "done"

export function Welcome() {
  const themeState = useTheme()
  const { theme, all, set, selected } = themeState
  const kv = useKV()
  const sdk = useSDK()
  const sync = useSync()
  const route = useRoute()
  const dialog = useDialog()

  const [step, setStep] = createSignal<WelcomeStep>("theme")
  const [selectedTheme, setSelectedTheme] = createSignal<string | null>(null)
  const [hoveredTheme, setHoveredTheme] = createSignal<string | null>(null)
  const [providerDialogOpen, setProviderDialogOpen] = createSignal(false)
  const [baseTheme, setBaseTheme] = createSignal<string>(selected)

  const welcomeThemes = createMemo(() => {
    const themes = all()
    return WELCOME_THEMES.filter((name) => themes[name]).map((name) => ({
      title: name,
      value: name,
    }))
  })

  function handleHover(name: string) {
    setHoveredTheme(name)
    set(name)
  }

  function handleHoverEnd() {
    setHoveredTheme(null)
    set(baseTheme())
  }

  function handleSelect(name: string) {
    setSelectedTheme(name)
    setBaseTheme(name)
    set(name)
  }

  function handleThemeConfirm() {
    const chosen = selectedTheme()
    if (chosen) {
      set(chosen)
      kv.set("theme", chosen)
    }
    setStep("provider")
  }

  async function handleNameConfirm(name: string | null) {
    if (name && name.trim()) {
      await sdk.client.config.update({ config: { username: name.trim() } }).catch(() => {})
    }
    kv.set("onboarded", true)
    kv.set("first_time", true)
    setStep("done")
    dialog.clear()
    route.navigate({ type: "home" })
  }

  createEffect(
    on(
      () => sync.status === "complete" && step() === "provider" && providerDialogOpen(),
      (ready) => {
        if (!ready) return
        if (sync.data.provider.length > 0) {
          dialog.clear()
          setStep("name")
        }
      },
    ),
  )

  createEffect(
    on(
      () => step() === "provider",
      (isProvider) => {
        if (!isProvider) return
        if (sync.data.provider.length > 0) {
          setStep("name")
          return
        }
        setProviderDialogOpen(true)
        dialog.replace(
          () => <DialogProvider />,
          () => {
            // User pressed Escape - still proceed to name step
            setProviderDialogOpen(false)
            setStep("name")
          },
        )
      },
    ),
  )

  return (
    <box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center">
      <Show when={step() === "theme"}>
        <ThemeStep
          themes={welcomeThemes()}
          selected={selectedTheme()}
          onSelect={handleSelect}
          onHover={handleHover}
          onHoverEnd={handleHoverEnd}
          onConfirm={handleThemeConfirm}
        />
      </Show>
      <Show when={step() === "provider"}>
        <ProviderStep />
      </Show>
      <Show when={step() === "name"}>
        <NameStep onConfirm={handleNameConfirm} />
      </Show>
    </box>
  )
}

function ThemeStep(props: {
  themes: { title: string; value: string }[]
  selected: string | null
  onSelect: (name: string) => void
  onHover: (name: string) => void
  onHoverEnd: () => void
  onConfirm: () => void
}) {
  const { theme } = useTheme()
  const [hovered, setHovered] = createSignal<number | null>(null)

  return (
    <box flexDirection="column" alignItems="center" gap={1}>
      <box flexDirection="column" alignItems="center" marginBottom={1}>
        <text fg={theme.primary} attributes={TextAttributes.BOLD}>
          Welcome to Octo Code
        </text>
        <text fg={theme.textMuted}>Choose your theme to get started</text>
      </box>
      <box flexDirection="row" gap={2}>
        <For each={props.themes}>
          {(t, i) => {
            const isActive = createMemo(() => props.selected === t.value)
            const isHovered = createMemo(() => hovered() === i())
            return (
              <box
                flexDirection="column"
                alignItems="center"
                gap={1}
                padding={1}
                paddingLeft={2}
                paddingRight={2}
                borderStyle="rounded"
                borderColor={isHovered() ? theme.primary : isActive() ? theme.primary : theme.border}
                backgroundColor={theme.backgroundElement}
                onMouseOver={() => {
                  setHovered(i())
                  props.onHover(t.value)
                }}
                onMouseOut={() => {
                  setHovered(null)
                  props.onHoverEnd()
                }}
                onMouseUp={() => {
                  props.onSelect(t.value)
                  props.onConfirm()
                }}
              >
                <text
                  fg={isHovered() ? theme.primary : isActive() ? theme.primary : theme.textMuted}
                  attributes={isActive() ? TextAttributes.BOLD : undefined}
                >
                  {t.title}
                </text>
              </box>
            )
          }}
        </For>
      </box>
    </box>
  )
}

function ProviderStep() {
  const { theme } = useTheme()
  return (
    <box flexDirection="column" alignItems="center" gap={1}>
      <text fg={theme.primary} attributes={TextAttributes.BOLD}>
        Connect a Provider
      </text>
      <text fg={theme.textMuted}>Select a provider from the dialog</text>
    </box>
  )
}

function NameStep(props: { onConfirm: (name: string | null) => void }) {
  const { theme } = useTheme()
  const dialog = useDialog()

  onMount(() => {
    DialogPrompt.show(dialog, "What should we call you?", {
      placeholder: "Your name",
    }).then((name) => {
      props.onConfirm(name)
    })
  })

  return (
    <box flexDirection="column" alignItems="center" gap={1}>
      <text fg={theme.primary} attributes={TextAttributes.BOLD}>
        One more thing...
      </text>
      <Spinner color={theme.textMuted}>Waiting for your name...</Spinner>
    </box>
  )
}
