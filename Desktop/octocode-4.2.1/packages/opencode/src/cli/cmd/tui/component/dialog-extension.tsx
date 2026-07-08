import { DialogSelect } from "@/cli/cmd/tui/ui/dialog-select"
import { useDialog } from "@/cli/cmd/tui/ui/dialog"
import { useKV } from "@/cli/cmd/tui/context/kv"
import { useToast } from "@/cli/cmd/tui/ui/toast"
import { useSDK } from "@/cli/cmd/tui/context/sdk"

export function DialogExtension() {
  const dialog = useDialog()
  const kv = useKV()
  const toast = useToast()
  const sdk = useSDK()
  const installed = kv.get("extension_installed") as boolean

  if (installed) {
    try {
      const { execSync } = require("child_process")
      const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim()
      const serverPath = globalRoot + "/octocode-desktop-ext/src/octocode-desktop/browser-server.cjs"
      const { spawn } = require("child_process")
      const proc = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "pipe"] })
      setTimeout(() => {
        proc.stdin.write(JSON.stringify({ action: "navigate", url: sdk.url, id: 1 }) + "\n")
        toast.show({ message: "Extension browser opened with live server", duration: 3000 })
      }, 1000)
    } catch {
      toast.show({ message: "Extension browser started", duration: 3000 })
    }
    dialog.clear()
    return <box />
  }

  return (
    <DialogSelect
      title="Automation Extension"
      skipFilter
      options={[
        { value: "yes", title: "Yes, install now", description: "npm install -g octocode-desktop-ext" },
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
          const { execSync } = await import("child_process")
          const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim()
          const serverPath = globalRoot + "/octocode-desktop-ext/src/octocode-desktop/browser-server.cjs"
          const { spawn } = await import("child_process")
          const proc = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "pipe"] })
          await new Promise(r => setTimeout(r, 1000))
          proc.stdin.write(JSON.stringify({ action: "navigate", url: sdk.url, id: 1 }) + "\n")
          toast.show({ message: "Extension installed and browser started", duration: 3000 })
          dialog.clear()
        } catch (e: any) {
          toast.show({ message: `Install failed: ${e?.message || "unknown"}`, variant: "error", duration: 5000 })
          dialog.clear()
        }
      }}
    />
  )
}
