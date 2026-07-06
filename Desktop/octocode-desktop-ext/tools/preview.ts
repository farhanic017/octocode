// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
import { z } from "zod"
import { tool } from "./helper"

export const preview_start = tool({
  description: "Open a live preview of a URL in a browser window. Auto-reloads when dev server signals changes.",
  args: {
    url: z.string().describe("URL to preview (e.g., http://localhost:3000)"),
  },
  async execute(args) {
    const { navigate } = await import("../src/octocode-desktop/browser.js")
    const result = await navigate(args.url)
    return {
      title: "Preview opened",
      output: `Live preview: ${result.title}\nURL: ${result.url}\n\nThe browser will auto-reload when the dev server signals changes.`,
    }
  },
})

export const preview_screenshot = tool({
  description: "Capture a screenshot of the current live preview.",
  args: {
    selector: z.string().optional().describe("CSS selector (optional, captures viewport if omitted)"),
  },
  async execute(args) {
    const { screenshot } = await import("../src/octocode-desktop/browser.js")
    const result = await screenshot(args.selector)
    return {
      title: "Preview screenshot",
      output: `Screenshot captured. Size: ${result.size} bytes.`,
      attachments: [{ type: "file", mime: "image/png", url: `data:image/png;base64,${result.base64}` }],
    }
  },
})

export const preview_reload = tool({
  description: "Force reload the live preview.",
  args: {},
  async execute() {
    const { evaluate } = await import("../src/octocode-desktop/browser.js")
    await evaluate("location.reload()")
    return { title: "Preview reloaded", output: "Preview reloaded." }
  },
})

export const preview_evaluate = tool({
  description: "Execute JavaScript in the live preview browser.",
  args: {
    script: z.string().describe("JavaScript to evaluate"),
  },
  async execute(args) {
    const { evaluate } = await import("../src/octocode-desktop/browser.js")
    const result = await evaluate(args.script)
    return { title: "Script executed", output: `Result: ${JSON.stringify(result)}` }
  },
})

export const preview_stop = tool({
  description: "Close the live preview browser window.",
  args: {},
  async execute() {
    const { closeBrowser } = await import("../src/octocode-desktop/browser.js")
    await closeBrowser()
    return { title: "Preview closed", output: "Live preview closed." }
  },
})
