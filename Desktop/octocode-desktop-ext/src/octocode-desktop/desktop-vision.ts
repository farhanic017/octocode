import { execSync } from "child_process"

// Store last vision analysis for split-view display
let lastAnalysis: VisionResult | null = null
let analysisHistory: VisionResult[] = []

export interface VisionResult {
  timestamp: number
  action: string
  position?: { x: number; y: number }
  description: string
  screenshot: string
  success: boolean
}

export interface VisionPrompt {
  action: string
  position?: { x: number; y: number }
  target?: string
  context?: string
}

export function buildVisionPrompt(prompt: VisionPrompt): string {
  const parts = [`Agent performed: ${prompt.action}`]

  if (prompt.position) {
    parts.push(`Position: (${prompt.position.x}, ${prompt.position.y})`)
  }
  if (prompt.target) {
    parts.push(`Target element: ${prompt.target}`)
  }
  if (prompt.context) {
    parts.push(`Context: ${prompt.context}`)
  }

  parts.push("")
  parts.push("Analyze the screenshot above and answer:")
  parts.push("1. Did the action succeed? What changed on screen?")
  parts.push("2. What is the current state of the application?")
  parts.push("3. What should the agent do next to achieve its goal?")

  return parts.join("\n")
}

export function analyzeScreenshot(screenshotBase64: string, prompt: VisionPrompt): VisionResult {
  const result: VisionResult = {
    timestamp: Date.now(),
    action: prompt.action,
    position: prompt.position,
    description: "", // Will be filled by LLM vision call
    screenshot: screenshotBase64,
    success: true,
  }

  analysisHistory.push(result)
  if (analysisHistory.length > 50) analysisHistory = analysisHistory.slice(-50)
  lastAnalysis = result

  return result
}

export function getLastAnalysis(): VisionResult | null {
  return lastAnalysis
}

export function getAnalysisHistory(limit: number = 10): VisionResult[] {
  return analysisHistory.slice(-limit)
}

export function captureAndAnalyze(prompt: VisionPrompt): {
  screenshot: string
  prompt: string
} {
  try {
    const raw = execSync(
      process.platform === "win32"
        ? 'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds"'
        : process.platform === "darwin"
          ? "screencapture -x /tmp/octo-vision.png && base64 /tmp/octo-vision.png"
          : "import -window root /tmp/octo-vision.png && base64 /tmp/octo-vision.png",
      { encoding: "base64", maxBuffer: 10 * 1024 * 1024 }
    )

    const visionPrompt = buildVisionPrompt(prompt)
    return { screenshot: raw, prompt: visionPrompt }
  } catch {
    return { screenshot: "", prompt: buildVisionPrompt(prompt) }
  }
}
