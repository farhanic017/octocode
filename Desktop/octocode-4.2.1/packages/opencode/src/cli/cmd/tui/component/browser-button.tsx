import { createSignal, onMount, onCleanup, Show } from "solid-js"
import { useTheme } from "@/cli/cmd/tui/context/theme"
import { useSDK } from "@/cli/cmd/tui/context/sdk"
import { useKeyboard } from "@opentui/solid"

interface ServerStatus {
  running: boolean
  url?: string
  port?: number
}

export function BrowserButton(props: { sessionId: string }) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const [status, setStatus] = createSignal<ServerStatus>({ running: false })
  const [showMenu, setShowMenu] = createSignal(false)
  const [hovered, setHovered] = createSignal(false)

  const checkStatus = async () => {
    try {
      const result = await sdk.client.session.run({
        sessionID: props.sessionId,
        message: "/browser status",
      })
      setStatus({ running: true, url: result?.url })
    } catch {
      setStatus({ running: false })
    }
  }

  onMount(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 10000)
    onCleanup(() => clearInterval(interval))
  })

  useKeyboard((evt) => {
    if (evt.name === "escape" && showMenu()) {
      setShowMenu(false)
      evt.preventDefault()
    }
  })

  const handleClick = async () => {
    if (status().running && status().url) {
      // Open browser - this will be handled by the extension
    } else {
      setShowMenu(!showMenu())
    }
  }

  const startServer = async (command: string) => {
    try {
      await sdk.client.session.run({
        sessionID: props.sessionId,
        message: `/browser start-server --command "${command}" --sessionId ${props.sessionId}`,
      })
      await checkStatus()
      setShowMenu(false)
    } catch (e) {
      console.error("Failed to start server:", e)
    }
  }

  return (
    <box flexDirection="column">
      <box
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        paddingLeft={1}
        paddingRight={1}
        paddingTop={0}
        paddingBottom={0}
        backgroundColor={hovered() ? theme().backgroundElement : "transparent"}
        color={status().running ? theme().success : theme().textMuted}
      >
        {status().running ? "[Browser]" : "[Server]"}
      </box>

      <Show when={showMenu()}>
        <box
          position="absolute"
          top={2}
          left={0}
          flexDirection="column"
          backgroundColor={theme().backgroundPanel}
          borderStyle="single"
          borderColor={theme().border}
          paddingLeft={1}
          paddingRight={1}
          zIndex={100}
        >
          <box
            onClick={() => startServer("npm run dev")}
            color={theme().text}
            hoverStyle={{ backgroundColor: theme().backgroundElement }}
          >
            npm run dev
          </box>
          <box
            onClick={() => startServer("bun run dev")}
            color={theme().text}
            hoverStyle={{ backgroundColor: theme().backgroundElement }}
          >
            bun run dev
          </box>
          <box
            onClick={() => startServer("yarn dev")}
            color={theme().text}
            hoverStyle={{ backgroundColor: theme().backgroundElement }}
          >
            yarn dev
          </box>
        </box>
      </Show>
    </box>
  )
}
