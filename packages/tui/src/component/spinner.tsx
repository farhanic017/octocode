import { Show } from "solid-js"
import { useTheme } from "../context/theme"
import type { JSX } from "@opentui/solid"
import type { RGBA } from "@opentui/core"

export function Spinner(props: { children?: JSX.Element; color?: RGBA }) {
  const { theme } = useTheme()
  const color = () => props.color ?? theme.textMuted
  return (
    <box flexDirection="row" gap={1}>
      <text fg={color()}>⋯</text>
      <Show when={props.children}>
        <text fg={color()}>{props.children}</text>
      </Show>
    </box>
  )
}
