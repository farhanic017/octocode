import type { JSX } from "solid-js"
import type { RGBA } from "@opentui/core"
import open from "open"

export interface LinkProps {
  href: string
  children?: JSX.Element | string
  fg?: RGBA
}

let externalNavigate: ((url: string) => Promise<void>) | null = null

export function setLinkNavigator(fn: (url: string) => Promise<void>) {
  externalNavigate = fn
}

export function Link(props: LinkProps) {
  const displayText = props.children ?? props.href

  return (
    <text
      fg={props.fg}
      onMouseUp={async () => {
        if (externalNavigate) {
          await externalNavigate(props.href).catch(() => {})
          return
        }
        open(props.href).catch(() => {})
      }}
    >
      {displayText}
    </text>
  )
}
