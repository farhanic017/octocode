import { createMemo, onMount } from "solid-js"
import { RGBA } from "@opentui/core"
import { useLocal } from "@/cli/cmd/tui/context/local"
import { DialogSelect } from "@/cli/cmd/tui/ui/dialog-select"
import { useDialog } from "@/cli/cmd/tui/ui/dialog"

export const VARIANT_COLORS: Record<string, RGBA> = {
  "default": RGBA.fromHex("#8f8586"),
  "low": RGBA.fromHex("#69db7c"),
  "medium": RGBA.fromHex("#ffd43b"),
  "high": RGBA.fromHex("#ff922b"),
  "xhigh": RGBA.fromHex("#ff6b6b"),
  "max": RGBA.fromHex("#e03131"),
}

export function DialogVariant() {
  const local = useLocal()
  const dialog = useDialog()

  onMount(() => dialog.setSize("small"))

  const options = createMemo(() => {
    return [
      {
        value: "default",
        title: "Default",
        color: VARIANT_COLORS["default"],
        onSelect: () => {
          dialog.clear()
          local.model.variant.set(undefined)
        },
      },
      ...local.model.variant.list().map((variant) => ({
        value: variant,
        title: variant,
        color: VARIANT_COLORS[variant.toLowerCase()] ?? RGBA.fromHex("#8f8586"),
        onSelect: () => {
          dialog.clear()
          local.model.variant.set(variant)
        },
      })),
    ]
  })

  const currentValue = createMemo(() => local.model.variant.selected() ?? "default")

  return (
    <DialogSelect<string>
      options={options()}
      title={"Reasoning"}
      current={currentValue()}
      flat={true}
      maxHeight={7}
      skipFilter={true}
    />
  )
}
