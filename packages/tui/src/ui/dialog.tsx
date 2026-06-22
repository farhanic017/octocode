import { useRenderer, useTerminalDimensions } from "@opentui/solid"
import { batch, createContext, createEffect, onCleanup, Show, useContext, type JSX, type ParentProps } from "solid-js"
import { useTheme } from "../context/theme"
import { MouseButton, Renderable, RGBA } from "@opentui/core"
import { createStore } from "solid-js/store"
import { useToast } from "./toast"
import { Flag } from "@octocode-ai/core/flag/flag"
import { useBindings, useOctocodeModeStack } from "../keymap"
import { useClipboard } from "../context/clipboard"

export function Dialog(
  props: ParentProps<{
    size?: "small" | "medium" | "large" | "xlarge" | "fullscreen"
    onClose: () => void
    position?: { x: number; y: number }
  }>,
) {
  const dimensions = useTerminalDimensions()
  const { theme } = useTheme()
  const renderer = useRenderer()

  let dismiss = false
  const width = () => {
    if (props.size === "fullscreen") return dimensions().width
    if (props.size === "xlarge") return 116
    if (props.size === "large") return 88
    if (props.size === "small") return 22
    return 60
  }

  const position = () => {
    if (props.position) {
      return {
        left: Math.max(0, Math.min(props.position.x, dimensions().width - width())),
        top: Math.max(0, props.position.y - 10),
      }
    }
    return {
      left: (dimensions().width - width()) / 2,
      top: dimensions().height / 4,
    }
  }

  return (
    <box
      onMouseDown={() => {
        dismiss = !!renderer.getSelection()
      }}
      onMouseUp={() => {
        if (dismiss) {
          dismiss = false
          return
        }
        props.onClose?.()
      }}
      width={dimensions().width}
      height={dimensions().height}
      alignItems={props.position ? "flex-start" : "center"}
      justifyContent={props.position ? "flex-start" : "center"}
      position="absolute"
      zIndex={3000}
      paddingTop={props.position ? position().top : 0}
      paddingLeft={props.position ? position().left : 0}
      left={0}
      top={0}
      backgroundColor={props.size === "fullscreen" ? theme.background : RGBA.fromInts(0, 0, 0, 10)}
    >
      <box
        onMouseUp={(e: { stopPropagation(): void }) => {
          dismiss = false
          e.stopPropagation()
        }}
        width={width()}
        maxWidth={dimensions().width}
        height={props.size === "fullscreen" ? dimensions().height : undefined}
        backgroundColor={theme.backgroundPanel}
        paddingTop={props.size === "small" ? 0 : 1}
        flexDirection="column"
      >
        {props.children}
      </box>
    </box>
  )
}

function init() {
  const [store, setStore] = createStore({
    stack: [] as {
      element: JSX.Element
      onClose?: () => void
      position?: { x: number; y: number }
    }[],
    size: "medium" as "small" | "medium" | "large" | "xlarge" | "fullscreen",
  })

  const renderer = useRenderer()
  const modeStack = useOctocodeModeStack()

  createEffect(() => {
    if (store.stack.length === 0) return
    const popMode = modeStack.push("modal")
    onCleanup(popMode)
  })

  let focus: Renderable | null
  function refocus() {
    setTimeout(() => {
      if (!focus) return
      if (focus.isDestroyed) return
      const queue: Renderable[] = [renderer.root]
      while (queue.length > 0) {
        const item = queue.pop()!
        for (const child of item.getChildren()) {
          if (child === focus) {
            focus.focus()
            return
          }
          queue.push(child)
        }
      }
    }, 1)
  }

  useBindings(() => ({
    enabled: store.stack.length > 0 && !renderer.getSelection()?.getSelectedText(),
    priority: 10,
    bindings: [
      {
        key: "escape",
        desc: "Close dialog",
        group: "Dialog",
        cmd: () => {
          if (renderer.getSelection()) {
            renderer.clearSelection()
          }
          const current = store.stack.at(-1)
          current?.onClose?.()
          setStore("stack", store.stack.slice(0, -1))
          refocus()
        },
      },
      {
        key: "ctrl+c",
        desc: "Close dialog",
        group: "Dialog",
        cmd: () => {
          if (renderer.getSelection()) {
            renderer.clearSelection()
          }
          const current = store.stack.at(-1)
          current?.onClose?.()
          setStore("stack", store.stack.slice(0, -1))
          refocus()
        },
      },
    ],
  }))

  return {
    clear() {
      for (const item of store.stack) {
        if (item.onClose) item.onClose()
      }
      batch(() => {
        setStore("size", "medium")
        setStore("stack", [])
      })
      refocus()
    },
    replace(input: any, onClose?: () => void, position?: { x: number; y: number }) {
      if (store.stack.length === 0) {
        focus = renderer.currentFocusedRenderable
        focus?.blur()
      }
      for (const item of store.stack) {
        if (item.onClose) item.onClose()
      }
      setStore("stack", [
        {
          element: input,
          onClose,
          position,
        },
      ])
    },
    get stack() {
      return store.stack
    },
    get size() {
      return store.size
    },
    setSize(size: "small" | "medium" | "large" | "xlarge" | "fullscreen") {
      setStore("size", size)
    },
  }
}

export type DialogContext = ReturnType<typeof init>

const ctx = createContext<DialogContext>()

export function DialogProvider(props: ParentProps) {
  const value = init()
  const renderer = useRenderer()
  const toast = useToast()
  const clipboard = useClipboard()

  function copySelection() {
    const text = renderer.getSelection()?.getSelectedText()
    if (!text || !clipboard.write) return false
    void clipboard.write(text).then(
      () => toast.show({ message: "Copied to clipboard", variant: "info" }),
      (error) => toast.error(error),
    )
    renderer.clearSelection()
    return true
  }

  return (
    <ctx.Provider value={value}>
      {props.children}
      <box
        position="absolute"
        zIndex={3000}
        onMouseDown={(evt: { button: number; preventDefault(): void; stopPropagation(): void }) => {
          if (!Flag.OCTOCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT) return
          if (evt.button !== MouseButton.RIGHT) return

          if (!copySelection()) return
          evt.preventDefault()
          evt.stopPropagation()
        }}
        onMouseUp={!Flag.OCTOCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT ? copySelection : undefined}
      >
        <Show when={value.stack.length}>
          <Dialog onClose={() => value.clear()} size={value.size} position={value.stack.at(-1)?.position}>
            {value.stack.at(-1)!.element}
          </Dialog>
        </Show>
      </box>
    </ctx.Provider>
  )
}

export function useDialog() {
  const value = useContext(ctx)
  if (!value) {
    throw new Error("useDialog must be used within a DialogProvider")
  }
  return value
}
