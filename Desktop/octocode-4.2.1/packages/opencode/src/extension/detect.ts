import { execSync } from "child_process"
import { existsSync } from "fs"
import path from "path"

export interface ExtensionInfo {
  installed: boolean
  version?: string
  path?: string
  capabilities: string[]
}

const EXTENSION_PACKAGE = "octocode-desktop-ext"

const CAPABILITIES = [
  "desktop-automation",
  "browser-control",
  "screenshot",
  "clipboard",
  "app-management",
  "mouse-keyboard",
]

export function isExtensionInstalled(): boolean {
  try {
    const result = execSync(`npm list -g ${EXTENSION_PACKAGE} 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    })
    return result.includes(EXTENSION_PACKAGE)
  } catch {
    return false
  }
}

export function getExtensionVersion(): string | undefined {
  try {
    const result = execSync(`npm list -g ${EXTENSION_PACKAGE} version 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    })
    const match = result.match(/@([\d.]+)/)
    return match?.[1]
  } catch {
    return undefined
  }
}

export function getExtensionPath(): string | undefined {
  try {
    const result = execSync(`npm root -g 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim()
    const extPath = path.join(result, EXTENSION_PACKAGE)
    return existsSync(extPath) ? extPath : undefined
  } catch {
    return undefined
  }
}

export function detectExtension(): ExtensionInfo {
  const installed = isExtensionInstalled()
  if (!installed) {
    return {
      installed: false,
      capabilities: [],
    }
  }

  return {
    installed: true,
    version: getExtensionVersion(),
    path: getExtensionPath(),
    capabilities: CAPABILITIES,
  }
}

export function getCapabilitiesDescription(): string {
  return `
The OctoCode Desktop Extension provides:

1. Desktop Automation
   - Control mouse and keyboard across any app
   - Click, type, scroll, drag operations
   - Take screenshots of any screen region

2. Browser Control
   - Navigate websites
   - Click elements, fill forms
   - Extract data from pages
   - Take browser screenshots

3. App Management
   - Open/close any application
   - Auto-snap to split view
   - Focus and window management

4. Clipboard Access
   - Read/write clipboard content
   - Copy text from any app

5. Guardrails
   - Blocks dangerous actions
   - Rate limiting per tool
   - Cross-platform safety
`.trim()
}
