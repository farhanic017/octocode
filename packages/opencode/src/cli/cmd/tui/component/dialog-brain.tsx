import { createSignal, createMemo, onMount, For, Show } from "solid-js"
import { useDialog } from "@/cli/cmd/tui/ui/dialog"
import { useTheme } from "@/cli/cmd/tui/context/theme"
import { TextAttributes } from "@opentui/core"
import { useKV } from "@/cli/cmd/tui/context/kv"
import fs from "fs/promises"

export function DialogBrain() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const kv = useKV()
  const savedPath = (kv.get("brain_vault_path") as string) || ""
  const [files, setFiles] = createSignal<string[]>([])
  const [hoveredIdx, setHoveredIdx] = createSignal(-1)

  onMount(() => {
    if (savedPath) loadFiles(savedPath)
  })

  async function loadFiles(p: string) {
    try {
      const exists = await fs.stat(p).then(() => true).catch(() => false)
      if (!exists) {
        setFiles([])
        return
      }
      const all = await fs.readdir(p)
      setFiles(all.filter((f: string) => f.endsWith(".md")).sort())
    } catch {
      setFiles([])
    }
  }

  function showVaultSetter() {
    let textareaRef: any = null
    dialog.replace(() => {
      dialog.setSize("medium")
      return (
        <box flexDirection="column" gap={1} paddingLeft={2} paddingRight={2} paddingTop={1}>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>Obsidian Vault Path</text>
          {savedPath && <text fg={theme.textMuted}>Current: {savedPath}</text>}
          <text fg={theme.textMuted}>Enter the full path to your Obsidian vault:</text>
          <textarea
            height={3}
            keyBindings={[{ name: "return", action: "submit" }]}
            ref={(r: any) => {
              textareaRef = r
              setTimeout(() => r?.focus(), 1)
            }}
            placeholder={savedPath || "D:\\path\\to\\vault"}
            placeholderColor={theme.textMuted}
            textColor={theme.text}
            focusedTextColor={theme.text}
            cursorColor={theme.primary}
            onSubmit={() => {
              const path = textareaRef?.plainText?.trim()
              if (!path) return
              kv.set("brain_vault_path", path)
              loadFiles(path)
              showFileList(path)
            }}
          />
          <text fg={theme.textMuted}>
            <span style={{ fg: theme.primary }}>enter</span> save, <span style={{ fg: theme.primary }}>esc</span> cancel
          </text>
        </box>
      )
    })
  }

  function showFileList(vaultPath: string) {
    dialog.replace(() => {
      dialog.setSize("large")
      const currentFiles = files()
      return (
        <box flexDirection="column" gap={1} paddingLeft={1} paddingRight={1}>
          <box flexDirection="row" justifyContent="space-between" alignItems="center">
            <text fg={theme.text} attributes={TextAttributes.BOLD}>Brain</text>
            <box
              flexDirection="row"
              alignItems="center"
              paddingLeft={1}
              paddingRight={1}
              onMouseUp={() => showVaultSetter()}
            >
              <text fg={theme.success}>Vault</text>
            </box>
          </box>
          {currentFiles.length === 0 && (
            <text fg={theme.textMuted}>No memory files found in vault.</text>
          )}
          <For each={currentFiles}>
            {(file, i) => (
              <box
                flexDirection="row"
                gap={1}
                onMouseOver={() => setHoveredIdx(i())}
                onMouseOut={() => setHoveredIdx(-1)}
              >
                <text fg={hoveredIdx() === i() ? theme.primary : theme.text}>
                  {file}
                </text>
              </box>
            )}
          </For>
        </box>
      )
    })
  }

  return (
    <box flexDirection="column" gap={1} paddingLeft={1} paddingRight={1}>
      <box flexDirection="row" justifyContent="space-between" alignItems="center">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>Brain</text>
        <box
          flexDirection="row"
          alignItems="center"
          paddingLeft={1}
          paddingRight={1}
          onMouseUp={() => showVaultSetter()}
        >
          <text fg={theme.success}>Vault</text>
        </box>
      </box>
      {savedPath && (
        <text fg={theme.textMuted}>Vault: {savedPath}</text>
      )}
      {!savedPath && (
        <text fg={theme.textMuted}>
          Click <span style={{ fg: theme.success }}>Vault</span> to set your Obsidian vault path.
        </text>
      )}
    </box>
  )
}
