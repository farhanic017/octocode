// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
// Farhan's complete app layouts — every app on his PC categorized
// Merge this into app-knowledge.cjs BUILTIN_LAYOUTS

const EXTRA_LAYOUTS = {
  // === TASKBAR APPS ===
  "brave": {
    name: "Brave Browser",
    type: "browser",
    open: { method: "search", term: "brave" },
    snap: { direction: "right", waitMs: 1500 },
    coords: {
      right: {
        addressBar: { x: 1440, y: 45 },
        newTab: { x: 990, y: 45 },
        back: { x: 975, y: 45 },
        page: { x: 1440, y: 500 },
      },
    },
    workflow: ["Win+S brave", "snap right", "Ctrl+L address bar", "type URL", "Enter"],
    tips: ["Default browser for Farhan. Spotify, Le Chat, Stitch open as Brave extensions."],
    learned: Date.now(),
  },
  "canva": {
    name: "Canva Desktop",
    type: "design_tool",
    open: { method: "search", term: "canva" },
    snap: { direction: "right", waitMs: 3000 },
    coords: {
      right: {
        searchBar: { x: 1500, y: 55 },
        createButton: { x: 1800, y: 55 },
        homeTab: { x: 980, y: 55 },
        recentDesigns: { x: 1440, y: 400 },
        templateResults: { x: 1300, y: 400 },
        canvas: { x: 1440, y: 500 },
        toolbar: { x: 1440, y: 960 },
        sidebar: { x: 980, y: 400 },
      },
    },
    workflow: [
      "Win+S canva",
      "snap right",
      "search bar at top center — type template name",
      "Create button at top right — opens dropdown",
      "Template results show as grid of thumbnails",
      "Click template to open editor",
      "Editor: canvas center, toolbar bottom, sidebar left",
    ],
    tips: [
      "Search for templates: type 'burger shop banner' in search",
      "Create button opens dropdown with design types",
      "Templates load as editable designs in the canvas",
      "Left sidebar has: Design, Elements, Text, Uploads, Projects",
      "Bottom toolbar has: edit, font, color, effects, animate",
    ],
    learned: Date.now(),
  },
  "antigravity": {
    name: "Antigravity",
    type: "creative_tool",
    open: { method: "search", term: "antigravity" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      right: {
        canvas: { x: 1440, y: 400 },
        tools: { x: 980, y: 400 },
        properties: { x: 1900, y: 400 },
      },
    },
    workflow: ["Win+S antigravity", "snap right"],
    tips: ["Creative tool on Farhan's taskbar."],
    learned: Date.now(),
  },
  "kimi": {
    name: "Kimi AI",
    type: "chat",
    open: { method: "search", term: "kimi" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      right: {
        chatTab: { x: 1160, y: 55 },
        workTab: { x: 1060, y: 55 },
        newChat: { x: 1055, y: 95 },
        chatInput: { x: 1500, y: 505 },
        sendButton: { x: 1850, y: 575 },
        modelSelector: { x: 1780, y: 445 },
        sidebar: { x: 1000, y: 400 },
      },
    },
    workflow: [
      "Win+S kimi",
      "snap right",
      "Click Chat tab (x=1160, y=55) — NOT Work tab",
      "Click New Chat (x=1055, y=95)",
      "Click input field at center (x=1500, y=505) — NOT bottom",
      "Clipboard paste — do NOT use Ctrl+A (selects sidebar)",
      "Press Enter to send",
      "Wait 30-45s for response",
    ],
    tips: [
      "CRITICAL: Click Chat tab FIRST — Work tab has different input that does not work for conversation",
      "The input field is CENTER of the screen, not bottom (y=505, not y=920)",
      "DO NOT use Ctrl+A before paste — it selects sidebar text, not input text",
      "Just click the input area directly and paste — no need to clear first",
      "After first message, input moves to bottom of chat area",
      "Model selector shows K2.6 Thinking at bottom-right of input area",
      "Quick action buttons below input: Slides, Agent Swarm, Deep Research, Docs, Websites",
    ],
    learned: Date.now(),
  },
  "codex": {
    name: "Codex",
    type: "chat",
    open: { method: "search", term: "codex" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      right: {
        chatInput: { x: 1500, y: 945 },
        sidebar: { x: 980, y: 400 },
      },
    },
    workflow: ["Win+S codex", "snap right", "click input", "clip_paste", "Enter"],
    tips: ["OpenAI Codex desktop app."],
    learned: Date.now(),
  },

  // === DESKTOP APPS ===
  "obsidian": {
    name: "Obsidian",
    type: "note_taking",
    open: { method: "search", term: "obsidian" },
    snap: { direction: "right", waitMs: 3000 },
    coords: {
      right: {
        sidebar: { x: 980, y: 400 },
        editor: { x: 1440, y: 400 },
        fileExplorer: { x: 980, y: 300 },
        toolbar: { x: 1440, y: 15 },
        vault: { x: 980, y: 85 },
      },
    },
    workflow: ["Win+S obsidian", "snap right", "sidebar has file explorer", "click note to open", "editor center"],
    tips: ["Markdown notes. Left sidebar = file explorer. Farhan uses 'brain for ai' vault."],
    learned: Date.now(),
  },
  "blender": {
    name: "Blender 5.1",
    type: "3d_editor",
    open: { method: "search", term: "blender" },
    snap: { direction: "right", waitMs: 3000 },
    coords: {
      right: {
        viewport: { x: 1440, y: 500 },
        sceneCollection: { x: 1700, y: 120 },
        properties: { x: 1800, y: 400 },
        timeline: { x: 1440, y: 960 },
        menuBar: { x: 1440, y: 25 },
        modeDropdown: { x: 1050, y: 48 },
        transform: { x: 1750, y: 400 },
        addMenu: "Shift+A",
        editMode: "Tab",
        frontView: "Numpad1",
        topView: "Numpad7",
        renderF12: "F12",
        objectMode: "Tab",
      },
    },
    workflow: [
      "Win+S blender",
      "dismiss splash screen (click center)",
      "3D viewport center — default cube, camera, light",
      "Scene Collection top-right (Camera, Cube, Light)",
      "Properties panel right (Transform, Relations, Collections)",
      "Timeline bottom (frames 1-250)",
      "Top tabs: Layout, Modeling, Sculpting, UV Editing, etc.",
      "Left toolbar: Selection, Move, Rotate, Scale tools",
      "Shift+A = Add menu, Tab = Edit mode, F12 = Render",
    ],
    tips: [
      "Splash screen appears on launch — click anywhere to dismiss",
      "Default scene has Cube + Camera + Light",
      "Properties panel: Location/Rotation/Scale XYZ, Mode dropdown",
      "Viewport controls: Middle-mouse drag to orbit, Shift+MMB to pan, Scroll to zoom",
      "Shift+A opens Add menu for Mesh, Curve, Light, Camera, etc.",
      "Layout tab is default workspace — best for general 3D work",
      "LOAD TRAINING: require('./blender-training.cjs') for full hotkey/menu reference",
      "LOAD WORKFLOWS: require('./blender-workflows.cjs') for modeling guides",
      "LOAD MATERIALS: require('./blender-materials.cjs') for material/lighting reference",
      "Key workflow: Shift+A > Mesh > [shape] > Tab (Edit Mode) > E extrude / Ctrl+R loop cut / S scale",
      "Key workflow: Tab to Edit Mode > 1/2/3 for vertex/edge/face select > model away",
      "Key workflow: Materials: select object > Material tab > New > Principled BSDF",
      "Key workflow: Lighting: Shift+A > Light > Sun/Point/Area > adjust in properties",
      "Key workflow: Rendering: F12 for still, Ctrl+F12 for animation",
    ],
    learned: Date.now(),
  },
  "unity": {
    name: "Unity",
    type: "game_engine",
    open: { method: "search", term: "unity" },
    snap: { direction: "right", waitMs: 5000 },
    coords: {
      right: {
        hierarchy: { x: 980, y: 300 },
        scene: { x: 1440, y: 300 },
        inspector: { x: 1900, y: 400 },
        project: { x: 1440, y: 800 },
        console: { x: 1440, y: 900 },
      },
    },
    workflow: ["Win+S unity", "snap right", "hierarchy left", "scene center", "inspector right"],
    tips: ["Unity Hub opens first, then project. Takes long to load."],
    learned: Date.now(),
  },
  "github-desktop": {
    name: "GitHub Desktop",
    type: "git_client",
    open: { method: "search", term: "github" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      right: {
        repoList: { x: 980, y: 400 },
        changes: { x: 1440, y: 400 },
        commitButton: { x: 1900, y: 950 },
        branchBar: { x: 1440, y: 50 },
      },
    },
    workflow: ["Win+S github", "snap right", "select repo left", "review changes center", "commit right"],
    tips: ["Visual git client. Changes panel shows diffs."],
    learned: Date.now(),
  },
  "epic-games": {
    name: "Epic Games Launcher",
    type: "game_launcher",
    open: { method: "search", term: "epic" },
    snap: { direction: "right", waitMs: 5000 },
    coords: {
      right: {
        sidebar: { x: 980, y: 400 },
        store: { x: 1440, y: 400 },
        library: { x: 980, y: 200 },
      },
    },
    workflow: ["Win+S epic", "snap right"],
    tips: ["Heavy app, takes time to load. Store by default, Library tab left."],
    learned: Date.now(),
  },
  "nzxt-cam": {
    name: "NZXT CAM",
    type: "system_monitor",
    open: { method: "search", term: "nzxt" },
    snap: { direction: "right", waitMs: 3000 },
    coords: {
      right: {
        dashboard: { x: 1440, y: 400 },
        cpu: { x: 980, y: 200 },
        gpu: { x: 1440, y: 200 },
      },
    },
    workflow: ["Win+S nzxt", "snap right"],
    tips: ["Hardware monitoring. Shows CPU/GPU/RAM stats."],
    learned: Date.now(),
  },
  "proxima": {
    name: "Proxima",
    type: "creative_tool",
    open: { method: "search", term: "proxima" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      right: {
        canvas: { x: 1440, y: 400 },
        tools: { x: 980, y: 400 },
      },
    },
    workflow: ["Win+S proxima", "snap right"],
    tips: ["Creative tool on Farhan's taskbar."],
    learned: Date.now(),
  },
  "revision-tool": {
    name: "Revision Tool",
    type: "file_manager",
    open: { method: "search", term: "revision" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      right: {
        fileList: { x: 1200, y: 400 },
        preview: { x: 1600, y: 400 },
      },
    },
    workflow: ["Win+S revision", "snap right"],
    tips: ["File revision management tool."],
    learned: Date.now(),
  },

  // === BRAVE SHORTCUTS (web apps) ===
  "le-chat": {
    name: "Le Chat (Mistral AI)",
    type: "browser",
    open: { method: "search", term: "le chat" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      right: {
        chatInput: { x: 1500, y: 945 },
        sidebar: { x: 980, y: 400 },
        newChat: { x: 980, y: 85 },
      },
    },
    workflow: ["Win+S le chat", "snap right", "click input", "clip_paste", "Enter"],
    tips: ["Brave shortcut to Mistral AI chat. Same flow as Claude Desktop."],
    learned: Date.now(),
  },
  "stitch": {
    name: "Stitch",
    type: "browser",
    open: { method: "search", term: "stitch" },
    snap: { direction: "right", waitMs: 2000 },
    coords: {
      right: {
        canvas: { x: 1440, y: 400 },
        tools: { x: 980, y: 400 },
      },
    },
    workflow: ["Win+S stitch", "snap right"],
    tips: ["Brave shortcut. Web-based creative tool."],
    learned: Date.now(),
  },

  // === SYSTEM APPS ===
  "terminal": {
    name: "Windows Terminal",
    type: "terminal",
    open: { method: "search", term: "terminal" },
    snap: { direction: "left", waitMs: 1000 },
    coords: {
      left: {
        inputArea: { x: 480, y: 500 },
        tabBar: { x: 200, y: 15 },
        splitButton: { x: 900, y: 15 },
      },
    },
    workflow: ["Win+S terminal", "snap left (default side for OctoCode)"],
    tips: ["Farhan's terminal is always on the left half. Apps open on the right."],
    learned: Date.now(),
  },
  "settings": {
    name: "Windows Settings",
    type: "system",
    open: { method: "search", term: "settings" },
    snap: { direction: "right", waitMs: 1500 },
    coords: {
      right: {
        search: { x: 1440, y: 50 },
        sidebar: { x: 980, y: 400 },
        content: { x: 1440, y: 400 },
      },
    },
    workflow: ["Win+S settings", "snap right"],
    tips: ["Standard Windows 11 Settings app."],
    learned: Date.now(),
  },
  "file-explorer": {
    name: "File Explorer",
    type: "file_manager",
    open: { method: "key_combo", keys: ["LeftSuper", "E"] },
    snap: { direction: "right", waitMs: 1000 },
    coords: {
      right: {
        addressBar: { x: 1440, y: 45 },
        sidebar: { x: 980, y: 400 },
        fileList: { x: 1440, y: 400 },
      },
    },
    workflow: ["Win+E to open", "snap right", "Ctrl+L for address bar"],
    tips: ["Win+E is fastest. Ctrl+L to type path directly."],
    learned: Date.now(),
  },
}

module.exports = EXTRA_LAYOUTS
