import { useDialog } from "@/cli/cmd/tui/ui/dialog"
import { DialogSelect } from "@/cli/cmd/tui/ui/dialog-select"
import { useKV } from "@/cli/cmd/tui/context/kv"
import { useToast } from "@/cli/cmd/tui/ui/toast"
import { useBrowser } from "@/cli/cmd/tui/context/browser"
import { useSDK } from "@/cli/cmd/tui/context/sdk"

export function DialogExtension() {
  const dialog = useDialog()
  const kv = useKV()
  const toast = useToast()
  const browser = useBrowser()
  const sdk = useSDK()
  const installed = kv.get("extension_installed") as boolean

  if (installed) {
    if (!browser.isRunning()) {
      browser.start().then(() => {
        browser.navigate(sdk.url)
      })
    } else {
      browser.navigate(sdk.url)
    }
    dialog.clear()
    return <box />
  }

  return (
    <DialogSelect
      title="Install automation extension?"
      skipFilter
      options={[
        { value: "yes", title: "Yes, install and start browser", description: "npm install -g octocode-desktop-ext" },
        { value: "no", title: "No, maybe later" },
      ]}
      onSelect={async (option) => {
        if (option.value === "no") { dialog.clear(); return }
        dialog.replace(() => {
          dialog.setSize("medium")
          return <box paddingLeft={2} paddingRight={2} paddingTop={1}><text>Installing automation extension...</text></box>
        })
        try {
          const { $ } = await import("bun")
          await $`npm install -g octocode-desktop-ext`
          kv.set("extension_installed", true)
          await browser.start()
          await browser.navigate(sdk.url)
          toast.show({ message: "Extension installed. Browser started.", duration: 3000 })
          dialog.clear()
        } catch (e: any) {
          toast.show({ message: `Install failed: ${e?.message || "unknown"}`, variant: "error", duration: 5000 })
          dialog.clear()
        }
      }}
    />
  )
}
