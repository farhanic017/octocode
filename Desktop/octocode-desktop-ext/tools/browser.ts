// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
import { z } from "zod"
import { tool } from "./helper"

const browserPath = "../src/octocode-desktop/browser.js"

export const browser_navigate = tool({
  description: "Navigate to a URL in the shared browser instance.",
  args: {
    url: z.string().describe("URL to navigate to"),
  },
  async execute(args, ctx) {
    const { navigate } = await import(browserPath)
    const result = await navigate(args.url)
    return { title: `Navigated to ${result.title}`, output: `Title: ${result.title}\nURL: ${result.url}` }
  },
})

export const browser_click = tool({
  description: "Click an element in the browser by CSS selector.",
  args: {
    selector: z.string().describe("CSS selector"),
  },
  async execute(args, ctx) {
    const { click } = await import(browserPath)
    await click(args.selector)
    return { title: `Clicked ${args.selector}`, output: `Clicked: ${args.selector}` }
  },
})

export const browser_type = tool({
  description: "Type text into an input field in the browser by CSS selector.",
  args: {
    selector: z.string().describe("CSS selector of input field"),
    text: z.string().describe("Text to type"),
  },
  async execute(args, ctx) {
    const { type } = await import(browserPath)
    await type(args.selector, args.text)
    return { title: `Typed into ${args.selector}`, output: `Typed "${args.text}" into ${args.selector}` }
  },
})

export const browser_screenshot = tool({
  description: "Capture a screenshot of the browser viewport or a specific element.",
  args: {
    selector: z.string().optional().describe("CSS selector (optional, captures viewport if omitted)"),
  },
  async execute(args, ctx) {
    const { screenshot } = await import(browserPath)
    const result = await screenshot(args.selector)
    return {
      title: "Browser screenshot",
      output: `Screenshot captured. Size: ${result.size} bytes.`,
      attachments: [{ type: "file", mime: "image/png", url: `data:image/png;base64,${result.base64}` }],
    }
  },
})

export const browser_evaluate = tool({
  description: "Execute JavaScript in the browser and return the result.",
  args: {
    script: z.string().describe("JavaScript code to evaluate"),
  },
  async execute(args, ctx) {
    const { evaluate } = await import(browserPath)
    const result = await evaluate(args.script)
    return { title: "Script executed", output: `Result: ${JSON.stringify(result)}` }
  },
})

export const browser_wait = tool({
  description: "Wait for an element to appear in the browser.",
  args: {
    selector: z.string().describe("CSS selector to wait for"),
    timeout: z.number().optional().describe("Timeout in ms (default 10000)"),
  },
  async execute(args, ctx) {
    const { waitForElement } = await import(browserPath)
    await waitForElement(args.selector, args.timeout)
    return { title: "Element appeared", output: `Element ${args.selector} appeared` }
  },
})

export const browser_hover = tool({
  description: "Hover over an element in the browser by CSS selector.",
  args: {
    selector: z.string().describe("CSS selector"),
  },
  async execute(args, ctx) {
    const { hover } = await import(browserPath)
    await hover(args.selector)
    return { title: `Hovered ${args.selector}`, output: `Hovered: ${args.selector}` }
  },
})

export const browser_select = tool({
  description: "Select an option from a dropdown in the browser.",
  args: {
    selector: z.string().describe("CSS selector of select element"),
    value: z.string().describe("Option value to select"),
  },
  async execute(args, ctx) {
    const { select } = await import(browserPath)
    await select(args.selector, args.value)
    return { title: `Selected ${args.value}`, output: `Selected "${args.value}" in ${args.selector}` }
  },
})

export const browser_drag = tool({
  description: "Drag an element from source to target by CSS selectors.",
  args: {
    source: z.string().describe("CSS selector of source element"),
    target: z.string().describe("CSS selector of target element"),
  },
  async execute(args, ctx) {
    const { drag } = await import(browserPath)
    await drag(args.source, args.target)
    return { title: "Dragged", output: `Dragged ${args.source} → ${args.target}` }
  },
})
