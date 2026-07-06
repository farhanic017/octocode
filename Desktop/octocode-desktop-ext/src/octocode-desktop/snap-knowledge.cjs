// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
// Windows Snap Layout Knowledge Base
// Teaches OctoCode how Windows 11 snap layouts, drag-to-snap, and keyboard shortcuts work

const SCREENSHOT_DIR = "C:\\Users\\Farhan\\Desktop"

// Windows 11 Snap Shortcuts (all keyboard-based, no dragging needed)
const SNAP_SHORTCUTS = {
  // Basic splits
  snap_left_half: { keys: ["LeftSuper", "Left"], desc: "Snap focused window to left 50%" },
  snap_right_half: { keys: ["LeftSuper", "Right"], desc: "Snap focused window to right 50%" },
  snap_maximize: { keys: ["LeftSuper", "Up"], desc: "Maximize focused window" },
  snap_minimize: { keys: ["LeftSuper", "Down"], desc: "Minimize focused window" },
  snap_restore: { keys: ["LeftSuper", "Down"], desc: "Restore from maximized (press twice from maximized)" },

  // Quarter splits (Win11 only)
  snap_top_left: { keys: ["LeftSuper", "Left", "Up"], desc: "Snap to top-left quarter" },
  snap_top_right: { keys: ["LeftSuper", "Right", "Up"], desc: "Snap to top-right quarter" },
  snap_bottom_left: { keys: ["LeftSuper", "Left", "Down"], desc: "Snap to bottom-left quarter" },
  snap_bottom_right: { keys: ["LeftSuper", "Right", "Down"], desc: "Snap to bottom-right quarter" },

  // Third splits (Win11 only)
  snap_left_third: { keys: ["LeftSuper", "Left", "Left"], desc: "Snap to left third" },
  snap_center_third: { keys: ["LeftSuper", "Up", "Up"], desc: "Snap to center third" },
  snap_right_third: { keys: ["LeftSuper", "Right", "Right"], desc: "Snap to right third" },

  // Virtual desktop
  new_desktop: { keys: ["LeftSuper", "LeftControl", "D"], desc: "Create new virtual desktop" },
  next_desktop: { keys: ["LeftSuper", "LeftControl", "Right"], desc: "Switch to next virtual desktop" },
  prev_desktop: { keys: ["LeftSuper", "LeftControl", "Left"], desc: "Switch to previous virtual desktop" },
  task_view: { keys: ["LeftSuper", "Tab"], desc: "Open task view" },
}

// Common App Layouts — pre-built knowledge for fast navigation
const APP_LAYOUTS = {
  "claude": {
    name: "Claude Desktop",
    type: "chat",
    openMethod: "win_s_search",
    searchTerm: "claude",
    defaultSnap: "right",
    elements: {
      sidebar: { x: 15, y: 350, desc: "Left sidebar with chat history" },
      newChat: { x: 55, y: 85, desc: "New chat button" },
      chatInput: { x: 540, y: 365, desc: "Chat input field" },
      modelSelector: { x: 560, y: 410, desc: "Model picker (Sonnet/Haiku)" },
      sendButton: { x: 680, y: 410, desc: "Send message button" },
      codeTab: { x: 180, y: 55, desc: "Code tab in header" },
      coworkTab: { x: 120, y: 55, desc: "Cowork tab in header" },
    },
    inputOffset: { right: { x: 440, y: 365 }, left: { x: 1500, y: 510 } },
    snapInputCoords: { x: 1500, y: 510 },
    notes: "After snap_right, all coords shift ~+960px. New chat at x=1015, y=85. Input at x=1500, y=510.",
  },
  "spotify": {
    name: "Spotify Web Player",
    type: "browser",
    openMethod: "url",
    url: "https://open.spotify.com",
    browser: "Brave",
    defaultSnap: "right",
    elements: {
      search: { x: 0, y: 0, desc: "Search bar (Ctrl+L to focus)" },
      playButton: { x: 0, y: 0, desc: "Play/pause button at bottom" },
      home: { x: 0, y: 0, desc: "Home in left sidebar" },
      searchNav: { x: 0, y: 0, desc: "Search in left sidebar" },
      library: { x: 0, y: 0, desc: "Your Library in left sidebar" },
    },
    notes: "Opens as Brave browser tab. Use Ctrl+L for address bar. Spotify is a browser shortcut, not desktop app.",
  },
  "notepad": {
    name: "Notepad",
    type: "text_editor",
    openMethod: "win_s_search",
    searchTerm: "notepad",
    defaultSnap: "right",
    elements: {
      textArea: { x: 480, y: 400, desc: "Main text editing area" },
      menuBar: { x: 480, y: 15, desc: "File/Edit/View menu bar" },
      newButton: { x: 30, y: 15, desc: "New file button" },
      saveButton: { x: 60, y: 15, desc: "Save button" },
    },
    notes: "Simple text editor. Text area covers most of the window.",
  },
  "chrome": {
    name: "Google Chrome",
    type: "browser",
    openMethod: "win_s_search",
    searchTerm: "chrome",
    defaultSnap: "right",
    elements: {
      addressBar: { x: 480, y: 45, desc: "Address bar (Ctrl+L)" },
      newTab: { x: 30, y: 45, desc: "New tab button (+)" },
      back: { x: 15, y: 45, desc: "Back button" },
      forward: { x: 35, y: 45, desc: "Forward button" },
      refresh: { x: 55, y: 45, desc: "Refresh button" },
    },
    notes: "Standard Chromium browser layout.",
  },
  "vscode": {
    name: "Visual Studio Code",
    type: "code_editor",
    openMethod: "win_s_search",
    searchTerm: "code",
    defaultSnap: "right",
    elements: {
      explorer: { x: 20, y: 100, desc: "File explorer sidebar icon" },
      search: { x: 20, y: 150, desc: "Search sidebar icon" },
      git: { x: 20, y: 200, desc: "Source control sidebar icon" },
      extensions: { x: 20, y: 350, desc: "Extensions sidebar icon" },
      editor: { x: 480, y: 400, desc: "Main editor area" },
      terminal: { x: 480, y: 800, desc: "Integrated terminal (Ctrl+`)" },
      activityBar: { x: 20, y: 400, desc: "Activity bar (far left icons)" },
    },
    notes: "VSCode has activity bar on far left, sidebar, editor, and optional terminal at bottom.",
  },
  "figma": {
    name: "Figma",
    type: "design_tool",
    openMethod: "win_s_search",
    searchTerm: "figma",
    defaultSnap: "right",
    elements: {
      layers: { x: 20, y: 200, desc: "Layers panel left sidebar" },
      properties: { x: 940, y: 200, desc: "Properties panel right sidebar" },
      canvas: { x: 480, y: 400, desc: "Main canvas area" },
      toolbar: { x: 480, y: 15, desc: "Top toolbar" },
    },
    notes: "Figma is an Electron app. Canvas in center, layers left, properties right.",
  },
}

// Snap Layout Decision Engine
function getSnapStrategy(screenWidth, screenHeight) {
  // For 1920x1080 (standard): left/right half = 960px each
  // For 2560x1440 (QHD): left/right half = 1280px each
  // For 3840x2160 (4K): left/right half = 1920px each
  return {
    halfWidth: Math.floor(screenWidth / 2),
    halfHeight: Math.floor(screenHeight / 2),
    thirdWidth: Math.floor(screenWidth / 3),
    quarterWidth: Math.floor(screenWidth / 2),
    quarterHeight: Math.floor(screenHeight / 2),
    inputOffset: Math.floor(screenWidth / 2),
  }
}

// After snap_right, calculate where elements moved
function getSnappedCoords(appName, snapDirection) {
  const layout = APP_LAYOUTS[appName.toLowerCase()]
  if (!layout) return null

  const screen = getSnapStrategy(1920, 1080) // Default to 1080p
  const snapped = {}

  for (const [name, el] of Object.entries(layout.elements)) {
    snapped[name] = { ...el }
    if (snapDirection === "right") {
      snapped[name].x = el.x + screen.halfWidth
    } else if (snapDirection === "left") {
      snapped[name].x = el.x
    }
  }

  if (layout.snapInputCoords) {
    snapped._inputCoords = layout.snapInputCoords
  }

  return snapped
}

module.exports = { SNAP_SHORTCUTS, APP_LAYOUTS, getSnapStrategy, getSnappedCoords }
