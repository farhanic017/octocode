import { execSync } from "child_process"
import { detectExtension, getCapabilitiesDescription } from "./detect"

export interface InstallResult {
  success: boolean
  message: string
}

export function promptInstallMessage(): string {
  const capabilities = getCapabilitiesDescription()
  return `
The OctoCode Desktop Extension is not installed.

This extension provides powerful desktop and browser automation capabilities:
${capabilities}

To install, I'll run: npm install -g octocode-desktop-ext

This will enable me to:
- Control your browser for web research
- Take screenshots for visual analysis
- Automate desktop applications
- Use background browsing when web search fails

Would you like me to install it? (yes/no)
`.trim()
}

export function installExtension(): InstallResult {
  try {
    execSync("npm install -g octocode-desktop-ext", {
      encoding: "utf-8",
      timeout: 120000,
      stdio: "pipe",
    })

    const status = detectExtension()
    if (status.installed) {
      return {
        success: true,
        message: `Successfully installed octocode-desktop-ext v${status.version}`,
      }
    }

    return {
      success: false,
      message: "Installation completed but extension not detected",
    }
  } catch (e) {
    return {
      success: false,
      message: `Installation failed: ${e instanceof Error ? e.message : "Unknown error"}`,
    }
  }
}

export function isNeededForTask(taskDescription: string): boolean {
  const browserKeywords = [
    "browse",
    "website",
    "web page",
    "screenshot",
    "automate",
    "click",
    "fill form",
    "extract data",
    "search the web",
    "open browser",
    "navigate",
    "scrape",
    "crawl",
  ]

  const lowerTask = taskDescription.toLowerCase()
  return browserKeywords.some((keyword) => lowerTask.includes(keyword))
}
