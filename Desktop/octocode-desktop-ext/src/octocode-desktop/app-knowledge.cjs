// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
const fs = require("fs")
const path = require("path")

const KB_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".octocode", "app-layouts.json"
)

// CRITICAL RULES — learned the hard way, never forget
const RULES = {
  // Window focus: Always click the TARGET window to bring it to front before pasting
  // OctoCode terminal steals focus — clipboard paste goes wherever focus is
  FOCUS_FIRST: "ALWAYS click the target window (title bar or content area) BEFORE any paste/type action. If paste goes to wrong window, the focus was not set.",

  // Electron apps (Claude, Open Design) fight for focus against OctoCode terminal
  ELECTRON_FOCUS: "Electron apps lose focus to OctoCode terminal. Use PowerShell SetForegroundWindow script, then IMMEDIATELY paste in same batch. Do not add delays between focus and paste.",

  // Open Design Electron app: paste NEVER works — use localhost:3000 in browser
  OPEN_DESIGN_USE_BROWSER: "Open Design Electron app at D:\\SOFTWARE\\Open Design release-stable-win\\Open Design.exe steals focus from paste. Open http://localhost:3000 in Brave/Chrome instead — same app, browser automation works perfectly.",

  // Clipboard: PowerShell Set-Clipboard breaks with special chars — use temp file
  CLIPBOARD_TEMP_FILE: "For long text with quotes/apostrophes, write to C:\\Temp\\octo-clip.txt then use Get-Content to set clipboard. Direct Set-Clipboard with inline text breaks on special characters.",

  // React inputs (Claude, Open Design): direct typing garbles text
  CLIPBOARD_PASTE_ALWAYS: "ALWAYS use clipboard paste (Ctrl+V) for React/contenteditable inputs. Direct keyboard.type() or SendKeys garbles characters (conveHrsation, beineg).",

  // Win+S search is the most reliable way to open ANY app
  USE_WIN_S_SEARCH: "Win+S search is more reliable than clicking taskbar icons, protocol handlers, or cmd /c start. Protocol handlers (spotify:) may map to wrong apps.",

  // Web apps installed as shortcuts (Spotify, Le Chat, Stitch) open via Win+S search
  WEB_APPS_USE_SEARCH: "Web apps registered as Brave shortcuts (Spotify, Le Chat, Stitch) are found by Win+S search. Do NOT use browser URLs — the search opens them directly in Brave with proper app-like behavior.",

  // Take screenshots after EVERY action to verify state
  SCREENSHOT_AFTER_EVERYTHING: "Never assume an action succeeded. Take a screenshot after open, after snap, after paste, after send. Verify before proceeding.",

  // Split view: Click sidebar/title bar of target window first, THEN snap
  SPLIT_VIEW_PROTOCOL: "1. Click target window sidebar/title to focus. 2. Wait 200ms. 3. Send Win+Right to snap. 4. Wait 1500ms. 5. Take screenshot to verify.",

  // Open Design: Prompt text area placeholder changes each time
  OPEN_DESIGN_INPUT: "Input field placeholder text rotates ('Describe an app idea', 'Mock up a signup flow', etc). Click the TEXT AREA directly, not the placeholder text. The text area spans roughly center of the window.",
}

// Built-in layout knowledge — never lost
const BUILTIN_LAYOUTS = {
  "claude": {
    name: "Claude Desktop",
    type: "chat",
    open: { method: "search", term: "claude" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      left: {
        newChat: { x: 55, y: 85 },
        chatInput: { x: 540, y: 365 },
        modelPicker: { x: 560, y: 410 },
        sidebar: { x: 15, y: 350 },
      },
      right: {
        newChat: { x: 1015, y: 85 },
        chatInput: { x: 1500, y: 510 },
        modelPicker: { x: 1520, y: 410 },
        sidebar: { x: 975, y: 350 },
      },
    },
    workflow: [
      "open via Win+S search",
      "click sidebar to focus, then snap right",
      "click New Chat at (1015, 85)",
      "click input at (1500, 510)",
      "clip_paste message via temp file",
      "wait 2s then press Enter",
      "Ctrl+A Ctrl+C to copy response",
    ],
    tips: [
      "Model selector: Sonnet 5 Medium at (1520, 410)",
      "MCP warning bar at top — dismiss X at (1405, 87)",
      "For chat: paste first, verify text in input, THEN press Enter",
      "Reading response: Ctrl+A Ctrl+C, extract last response after pattern marker",
    ],
    learned: Date.now(),
  },
  "opendesign": {
    name: "Open Design",
    type: "design_tool",
    open: { method: "browser", url: "http://localhost:3000" },
    snap: { direction: "right", waitMs: 1500 },
    coords: {
      right: {
        inputArea: { x: 1300, y: 280 },
        sendButton: { x: 1340, y: 393 },
        newSketch: { x: 1580, y: 330 },
        designSystem: { x: 1000, y: 90 },
      },
    },
    workflow: [
      "Open http://localhost:3000 in browser (NOT Electron app)",
      "Click input text area",
      "Clear existing text (Ctrl+A, Delete)",
      "Paste prompt via clipboard",
      "Click Send button",
      "Wait 3-5 minutes for generation",
      "Preview panel shows result on right",
    ],
    tips: [
      "NEVER use Electron app for automation — focus issues make paste impossible",
      "MiMo Code is the AI model powering designs",
      "Glassmorphism skill loaded automatically for design prompts",
      "Design generation takes 2-5 minutes",
      "Template selector at bottom of input — leave as None for freeform",
    ],
    learned: Date.now(),
  },
  "spotify": {
    name: "Spotify",
    type: "web_app",
    open: { method: "search", term: "spotify" },
    snap: { direction: "right", waitMs: 3000 },
    coords: {
      right: {
        search: { x: 1050, y: 50 },
        playPause: { x: 1440, y: 985 },
        home: { x: 990, y: 80 },
        library: { x: 990, y: 550 },
      },
    },
    workflow: ["Win+S spotify", "snap right", "click search", "type song/artist", "click result to play"],
    tips: ["Brave shortcut — opens as web app in Brave. Win+S search is fastest. Never use URL or protocol handler."],
    learned: Date.now(),
  },
  "notepad": {
    name: "Notepad",
    type: "text_editor",
    open: { method: "search", term: "notepad" },
    snap: { direction: "right", waitMs: 1000 },
    coords: { right: { textArea: { x: 1440, y: 400 }, menuBar: { x: 1440, y: 15 } } },
    workflow: ["open via Win+S", "snap right", "click text area", "type text"],
    tips: ["Simple editor — click and type works directly"],
    learned: Date.now(),
  },
  "vscode": {
    name: "Visual Studio Code",
    type: "code_editor",
    open: { method: "search", term: "code" },
    snap: { direction: "right", waitMs: 1500 },
    coords: {
      right: {
        activityBar: { x: 980, y: 400 },
        explorer: { x: 1000, y: 100 },
        editor: { x: 1440, y: 400 },
        terminal: { x: 1440, y: 800 },
      },
    },
    workflow: ["open via Win+S", "snap right", "Ctrl+Shift+P for command palette", "Ctrl+` for terminal"],
    tips: ["Activity bar: far left strip. Ctrl+L for search. Ctrl+Shift+P for commands."],
    learned: Date.now(),
  },
  "chrome": {
    name: "Google Chrome / Brave",
    type: "browser",
    open: { method: "search", term: "chrome" },
    snap: { direction: "right", waitMs: 1500 },
    coords: {
      right: {
        addressBar: { x: 1440, y: 45 },
        newTab: { x: 990, y: 45 },
      },
    },
    workflow: ["open via Win+S", "snap right", "Ctrl+L for address bar", "type URL", "Enter"],
    tips: ["Ctrl+L = address bar, Ctrl+T = new tab, Ctrl+W = close tab"],
    learned: Date.now(),
  },
  "discord": {
    name: "Discord",
    type: "chat_app",
    open: { method: "search", term: "discord" },
    snap: { direction: "right", waitMs: 3000 },
    coords: {
      right: {
        channelList: { x: 1000, y: 400 },
        chatArea: { x: 1400, y: 400 },
        messageInput: { x: 1440, y: 950 },
      },
    },
    workflow: ["open via Win+S", "snap right", "click channel", "click input", "type and Enter"],
    tips: ["Server list far left. Message input at very bottom."],
    learned: Date.now(),
  },
}

// Windows Snap Shortcuts
const SNAP_SHORTCUTS = {
  snap_left: { keys: ["LeftSuper", "Left"], desc: "Snap to left half" },
  snap_right: { keys: ["LeftSuper", "Right"], desc: "Snap to right half" },
  maximize: { keys: ["LeftSuper", "Up"], desc: "Maximize" },
  minimize: { keys: ["LeftSuper", "Down"], desc: "Minimize" },
  snap_q1: { keys: ["LeftSuper", "Left", "Up"], desc: "Top-left quarter" },
  snap_q2: { keys: ["LeftSuper", "Right", "Up"], desc: "Top-right quarter" },
  snap_q3: { keys: ["LeftSuper", "Left", "Down"], desc: "Bottom-left quarter" },
  snap_q4: { keys: ["LeftSuper", "Right", "Down"], desc: "Bottom-right quarter" },
  search: { keys: ["LeftSuper", "S"], desc: "Windows Search" },
  task_view: { keys: ["LeftSuper", "Tab"], desc: "Task View" },
}

let _kb = null

function loadKB() {
  if (_kb) return _kb
  _kb = { ...BUILTIN_LAYOUTS }
  // Merge Farhan's personal app layouts
  try {
    const farhanApps = require("./farhan-apps.cjs")
    Object.assign(_kb, farhanApps)
  } catch {}
  // Merge user-saved layouts from disk
  try {
    const saved = JSON.parse(fs.readFileSync(KB_PATH, "utf8"))
    for (const [key, val] of Object.entries(saved)) {
      if (!_kb[key]) _kb[key] = val
    }
  } catch {}
  return _kb
}

function saveKB() {
  try {
    const dir = path.dirname(KB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(KB_PATH, JSON.stringify(_kb, null, 2))
  } catch {}
}

function getLayout(appName) {
  const kb = loadKB()
  return kb[appName.toLowerCase()] || null
}

function getRules() { return RULES }

function learnLayout(appName, layoutData) {
  const kb = loadKB()
  const existing = kb[appName.toLowerCase()] || {}
  kb[appName.toLowerCase()] = { ...existing, ...layoutData, learned: Date.now(), lastUpdated: Date.now() }
  _kb = kb
  saveKB()
}

function getAllLayouts() { return Object.keys(loadKB()) }
function getWorkflow(appName) { const l = getLayout(appName); return l ? l.workflow : null }
function getCoords(appName, snapDir) { const l = getLayout(appName); if (!l?.coords) return null; return l.coords[snapDir] || l.coords.right || null }

module.exports = { getLayout, learnLayout, getAllLayouts, getWorkflow, getCoords, BUILTIN_LAYOUTS, RULES, SNAP_SHORTCUTS, getRules }
