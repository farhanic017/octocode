// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
const { execSync } = require("child_process")
const { getLayout, saveLayout } = require("./layout-cache.cjs")

let lastAnalysis = null
let analysisHistory = []

function buildVisionPrompt(prompt) {
  if (prompt.mode === "layout") {
    return [
      `Extract the UI layout of ${prompt.appName || "this app"} as JSON.`,
      "For each visible interactive element, return:",
      "- name: button, input, menu, link, tab, etc",
      "- label: visible text on the element",
      "- x, y: center coordinates",
      "- w, h: approximate dimensions",
      "- state: active, disabled, focused, hovered",
      "",
      "Return ONLY a JSON array. No explanation.",
      'Example: [{"name":"button","label":"Play","x":500,"y":400,"w":80,"h":40,"state":"active"}]',
    ].join("\n")
  }

  if (prompt.mode === "chat") {
    return [
      "Look at this chat app screenshot.",
      "1. Is there new text from the other person? If so, what did they say?",
      "2. Where is the text input field? Give x,y coordinates of its center.",
      "3. Is the send button enabled? Where is it?",
      "Return ONLY JSON: {\"newMessage\":\"...\",\"inputCoords\":{\"x\":0,\"y\":0},\"sendButton\":{\"x\":0,\"y\":0,\"enabled\":true}}",
    ].join("\n")
  }

  const parts = [`Agent performed: ${prompt.action}`]
  if (prompt.position) parts.push(`Position: (${prompt.position.x}, ${prompt.position.y})`)
  if (prompt.target) parts.push(`Target: ${prompt.target}`)
  if (prompt.context) parts.push(`Context: ${prompt.context}`)
  parts.push("")
  parts.push("Analyze the screenshot and answer as JSON:")
  parts.push('{"success":true/false, "changed":"what changed", "state":"current app state", "nextAction":"what to do next"}')
  return parts.join("\n")
}

function analyzeScreenshot(screenshotBase64, prompt) {
  const result = {
    timestamp: Date.now(),
    action: prompt.action,
    position: prompt.position,
    description: "",
    screenshot: screenshotBase64,
    prompt: buildVisionPrompt(prompt),
    success: true,
  }
  analysisHistory.push(result)
  if (analysisHistory.length > 30) analysisHistory = analysisHistory.slice(-30)
  lastAnalysis = result
  return result
}

function getLastAnalysis() { return lastAnalysis }
function getAnalysisHistory(limit = 10) { return analysisHistory.slice(-limit) }

module.exports = { buildVisionPrompt, analyzeScreenshot, getLastAnalysis, getAnalysisHistory }
