import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/solid"
import { batch, createContext, Show, useContext, type JSX, type ParentProps } from "solid-js"
import { useTheme } from "@/cli/cmd/tui/context/theme"
import { MouseButton, Renderable, RGBA } from "@opentui/core"
import { createStore } from "solid-js/store"
import { useToast } from "./toast"
import { Flag } from "@/flag/flag"
import * as Selection from "@/cli/cmd/tui/util/selection"
import * as Clipboard from "@/cli/cmd/tui/util/clipboard"
import { useLanguage } from "@/cli/cmd/tui/context/language"

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
  const toast = useToast()
  const t = useLanguage().t

  let dismiss = false
  const isSmall = props.size === "small"
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
      backgroundColor={RGBA.fromInts(0, 0, 0, 10)}
    >
      <box
        onMouseUp={(e) => {
          dismiss = false
          e.stopPropagation()
        }}
        width={width()}
        maxWidth={dimensions().width}
        backgroundColor={theme.backgroundPanel}
        paddingTop={isSmall ? 0 : 1}
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
    size: "medium" as "small" | "medium" | "large" | "xlarge",
  })

  const renderer = useRenderer()

  useKeyboard((evt) => {
    if (store.stack.length === 0) return
    if (evt.defaultPrevented) return
    if ((evt.name === "escape" || (evt.ctrl && evt.name === "c")) && renderer.getSelection()?.getSelectedText()) return
    if (evt.name === "escape" || (evt.ctrl && evt.name === "c")) {
      if (renderer.getSelection()) {
        renderer.clearSelection()
      }
      const current = store.stack.at(-1)!
      current.onClose?.()
      setStore("stack", store.stack.slice(0, -1))
      evt.preventDefault()
      evt.stopPropagation()
      refocus()
    }
  })

  let focus: Renderable | null
  function refocus() {
    setTimeout(() => {
      if (!focus) return
      if (focus.isDestroyed) return
      function find(item: Renderable) {
        for (const child of item.getChildren()) {
          if (child === focus) return true
          if (find(child)) return true
        }
        return false
      }
      const found = find(renderer.root)
      if (!found) return
      focus.focus()
    }, 1)
  }

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
      setStore("size", "medium")
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
    setSize(size: "small" | "medium" | "large" | "xlarge") {
      setStore("size", size as any)
    },
  }
}

export type DialogContext = ReturnType<typeof init>

const ctx = createContext<DialogContext>()

export function DialogProvider(props: ParentProps) {
  const value = init()
  const renderer = useRenderer()
  const toast = useToast()
  const t = useLanguage().t
  return (
    <ctx.Provider value={value}>
      {props.children}
      <box
        position="absolute"
        zIndex={3000}
        onMouseDown={(evt) => {
          if (!Flag.MIMOCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT) return
          if (evt.button !== MouseButton.RIGHT) return

          if (!Selection.copy(renderer, toast, t("tui.toast.copied_to_clipboard"))) return
          evt.preventDefault()
          evt.stopPropagation()
        }}
        onMouseUp={
          !Flag.MIMOCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT
            ? () => Selection.copy(renderer, toast, t("tui.toast.copied_to_clipboard"))
            : undefined
        }
      >
        <Show when={value.stack.length}>
          <Dialog onClose={() => value.clear()} size={value.size} position={value.stack.at(-1)!.position}>
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


