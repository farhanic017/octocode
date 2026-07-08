import type { JSX } from "solid-js"
import type { RGBA } from "@opentui/core"
import defaultOpen from "open"

let extNavigate: ((url: string) => Promise<void>) | null = null

export function setLinkNavigator(fn: (url: string) => Promise<void>) {
  extNavigate = fn
}

export interface LinkProps {
  href: string
  children?: JSX.Element | string
  fg?: RGBA
}

export function Link(props: LinkProps) {
  const displayText = props.children ?? props.href

  return (
    <text
      fg={props.fg}
      onMouseUp={async () => {
        if (extNavigate) {
          await extNavigate(props.href).catch(() => {})
          return
        }
        defaultOpen(props.href).catch(() => {})
      }}
    >
      {displayText}
    </text>
  )
}
