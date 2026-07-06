// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
// Smart Navigation Engine — keyboard-first, screenshot-verified, resolution-aware
const { fork } = require("child_process")
const { execSync } = require("child_process")
const path = require("path")
const { getLayout } = require("./app-knowledge.cjs")

const WORKER_PATH = path.join(__dirname, "..", "tools", "nut-persistent-worker.cjs")
const SCREENSHOT_PS = path.join(__dirname, "..", "browser", "screenshot.ps1")

let _worker = null
let _workerId = 0

function getWorker() {
  if (_worker && !_worker.killed) return _worker
  _worker = fork(WORKER_PATH, [], { stdio: ["pipe", "pipe", "pipe", "ipc"] })
  _workerId++
  return _worker
}

function runBatch(actions) {
  return new Promise((resolve) => {
    const w = getWorker()
    const id = `nav-${Date.now()}-${_workerId}`
    const timeout = setTimeout(() => resolve({ success: false, error: "timeout" }), 30000)
    const handler = (msg) => {
      if (msg.id === id) {
        clearTimeout(timeout)
        w.removeListener("message", handler)
        resolve(msg)
      }
    }
    w.on("message", handler)
    w.on("error", (err) => { clearTimeout(timeout); _worker = null; resolve({ success: false, error: err.message }) })
    w.send({ id, batch: actions })
  })
}

function screenshot() {
  try {
    execSync(`powershell -File "${SCREENSHOT_PS}"`, { windowsHide: true, timeout: 5000 })
    const fs = require("fs")
    const imgPath = path.join(process.env.USERPROFILE, "Desktop", "octo-screenshot.png")
    if (fs.existsSync(imgPath)) {
      const buf = fs.readFileSync(imgPath)
      return buf.toString("base64")
    }
  } catch {}
  return null
}

function getScreenSize() {
  try {
    const raw = execSync(
      'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; Write-Output \\"$($b.Width)|$($b.Height)\\""',
      { encoding: "utf8", windowsHide: true, timeout: 3000 }
    )
    const [w, h] = raw.trim().split("|").map(Number)
    return { width: w || 1920, height: h || 1080 }
  } catch {
    return { width: 1920, height: 1080 }
  }
}

// Scale coordinates based on actual screen size
function scaleCoords(coords, actualWidth, actualHeight) {
  const baseWidth = 1920
  const baseHeight = 1080
  const scaleX = actualWidth / baseWidth
  const scaleY = actualHeight / baseHeight
  return {
    x: Math.round(coords.x * scaleX),
    y: Math.round(coords.y * scaleY),
  }
}

// Navigation strategies — from most reliable to least
const NAV = {
  // Open app via Win+S search (most reliable)
  openSearch(term) {
    return [
      { action: "key_combo", keys: ["LeftSuper", "S"], delay: 500 },
      { action: "type", text: term, delay: 800 },
      { action: "key", key: "Enter", delay: 100 },
    ]
  },

  // Open app via URL in default browser
  openUrl(url) {
    return [] // Use execSync: cmd /c start "" "url"
  },

  // Focus window by clicking its title bar area
  focusWindow(side) {
    if (side === "left") return [{ action: "click", x: 100, y: 15, delay: 200 }]
    if (side === "right") return [{ action: "click", x: 1440, y: 15, delay: 200 }]
    return [{ action: "click", x: 960, y: 15, delay: 200 }]
  },

  // Snap using keyboard (always works)
  snap(side) {
    if (side === "right") return [{ action: "snap_right", delay: 1500 }]
    if (side === "left") return [{ action: "snap_left", delay: 1500 }]
    if (side === "maximize") return [{ action: "maximize", delay: 500 }]
    return [{ action: "snap_right", delay: 1500 }]
  },

  // Type text via clipboard (reliable for all inputs)
  pasteText(text) {
    return [{ action: "clip_paste", text, delay: 1000 }]
  },

  // Press Enter
  send() {
    return [{ action: "key", key: "Enter", delay: 100 }]
  },
}

// Full app opening flow — opens, snaps, verifies
async function openApp(appName, opts = {}) {
  const screen = getScreenSize()
  const halfW = Math.floor(screen.width / 2)
  const layout = getLayout(appName)

  if (!layout) {
    // Unknown app — just open via search and snap
    await runBatch([...NAV.openSearch(opts.searchTerm || appName), ...NAV.snap("right")])
    await new Promise(r => setTimeout(r, 2000))
    const img = screenshot()
    return { success: true, snap: "right", screenshot: img, layout: null }
  }

  // Known app — use stored workflow
  const openCmds = []
  if (layout.open.method === "search") {
    openCmds.push(...NAV.openSearch(layout.open.term))
  } else if (layout.open.method === "url") {
    const { execSync: ex } = require("child_process")
    ex(`cmd /c start "" "${layout.open.url}"`, { windowsHide: true })
    openCmds.push({ action: "wait", delay: layout.snap.waitMs || 2000 })
  }

  const snapDir = opts.snap || layout.snap.direction || "right"
  openCmds.push(...NAV.snap(snapDir))

  await runBatch(openCmds)
  await new Promise(r => setTimeout(r, layout.snap.waitMs || 2000))

  // Focus the snapped window
  await runBatch(NAV.focusWindow(snapDir))
  await new Promise(r => setTimeout(r, 500))

  const img = screenshot()
  return { success: true, snap: snapDir, screenshot: img, layout }
}

// Chat with an app — uses layout knowledge for exact coordinates
async function chat(appName, message) {
  const layout = getLayout(appName)
  if (!layout) return { success: false, error: `No layout for ${appName}` }

  const coords = layout.coords?.right || layout.coords?.left
  if (!coords) return { success: false, error: `No coords for ${appName}` }

  const inputCoords = coords.chatInput || coords.input || coords.textArea
  if (!inputCoords) return { success: false, error: `No input coords for ${appName}` }

  const actions = [
    { action: "click", x: inputCoords.x, y: inputCoords.y, delay: 300 },
    ...NAV.pasteText(message),
    ...NAV.send(),
  ]

  return runBatch(actions)
}

// Start new chat in an app
async function newChat(appName) {
  const layout = getLayout(appName)
  if (!layout) return { success: false, error: `No layout for ${appName}` }

  const coords = layout.coords?.right
  if (!coords?.newChat) return { success: false, error: `No newChat coords for ${appName}` }

  return runBatch([
    { action: "click", x: coords.newChat.x, y: coords.newChat.y, delay: 2000 },
  ])
}

module.exports = { openApp, chat, newChat, screenshot, getScreenSize, runBatch, NAV, scaleCoords }
