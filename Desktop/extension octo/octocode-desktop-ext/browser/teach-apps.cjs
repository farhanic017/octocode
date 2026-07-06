const { fork } = require("child_process")
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const workerPath = path.join(__dirname, "..", "tools", "nut-persistent-worker.cjs")

function runBatch(actions) {
  return new Promise((resolve) => {
    const w = fork(workerPath, [], { stdio: ["pipe", "pipe", "pipe", "ipc"] })
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const timeout = setTimeout(() => { resolve({ success: false }); w.kill() }, 30000)
    const handler = (msg) => { if (msg.id === id) { clearTimeout(timeout); w.removeListener("message", handler); w.kill(); resolve(msg) } }
    w.on("message", handler)
    w.on("error", () => { clearTimeout(timeout); w.kill(); resolve({ success: false }) })
    w.send({ id, batch: actions })
  })
}

function ss(label) {
  execSync('powershell -File "C:\\Users\\Farhan\\Desktop\\extension octo\\octocode-desktop-ext\\browser\\screenshot.ps1"', { windowsHide: true, timeout: 5000 })
  console.log(`  [screenshot: ${label}]`)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function setupSplitScreen() {
  console.log("=== Setting up split view: Terminal LEFT, App RIGHT ===")

  // Step 1: Click OctoCode terminal to focus it
  console.log("1. Focusing terminal (left side)...")
  await runBatch([{ action: "click", x: 300, y: 500, delay: 300 }])

  // Step 2: Snap terminal to LEFT
  console.log("2. Snapping terminal to left half...")
  await runBatch([{ action: "snap_left", delay: 1500 }])
  ss("terminal-left")
  console.log("   Terminal should now be on LEFT half")
}

async function openAndSnapApp(appName, searchTerm) {
  console.log(`\n=== Opening ${appName} ===`)

  // Step 3: Open app via Win+S (new window will be foreground)
  console.log(`3. Opening ${appName} via Win+S...`)
  await runBatch([
    { action: "key_combo", keys: ["LeftSuper", "S"], delay: 500 },
    { action: "type", text: searchTerm, delay: 800 },
    { action: "key", key: "Enter", delay: 100 },
  ])
  await sleep(5000)

  // Step 4: Snap app to RIGHT
  console.log(`4. Snapping ${appName} to right half...`)
  await runBatch([{ action: "snap_right", delay: 2000 }])
  ss(`${appName}-split`)
  console.log(`   Split view: Terminal LEFT | ${appName} RIGHT`)

  // Wait for app to fully load
  await sleep(3000)
  ss(`${appName}-loaded`)
}

async function closeApp(processName) {
  console.log("Closing app...")
  await runBatch([{ action: "close_window", delay: 500 }])
  try { execSync(`taskkill /IM "${processName}" /F 2>nul`, { windowsHide: true }) } catch {}
  await sleep(1000)
}

async function main() {
  // ===== FIX SPLIT SCREEN =====
  await setupSplitScreen()

  // ===== TEACH FIGMA =====
  await openAndSnapApp("Figma", "figma")
  console.log("5. Learning Figma layout...")
  ss("figma-layout-full")
  // Click around to discover elements
  await runBatch([{ action: "click", x: 1440, y: 400, delay: 500 }])
  ss("figma-canvas")
  await closeApp("Figma.exe")
  console.log("   Figma taught and closed\n")

  // Re-establish split (app close may shift windows)
  await runBatch([{ action: "click", x: 300, y: 500, delay: 200 }])
  await runBatch([{ action: "snap_left", delay: 500 }])

  // ===== TEACH CANVA =====
  await openAndSnapApp("Canva", "canva")
  console.log("5. Learning Canva layout...")
  ss("canva-layout-full")
  await runBatch([{ action: "click", x: 1440, y: 400, delay: 500 }])
  ss("canva-canvas")
  await closeApp("Canva.exe")
  console.log("   Canva taught and closed\n")

  await runBatch([{ action: "click", x: 300, y: 500, delay: 200 }])
  await runBatch([{ action: "snap_left", delay: 500 }])

  // ===== TEACH KIMI =====
  await openAndSnapApp("Kimi", "kimi")
  console.log("5. Learning Kimi layout...")
  ss("kimi-layout-full")
  await runBatch([{ action: "click", x: 1500, y: 945, delay: 500 }])
  ss("kimi-input")
  await closeApp("Kimi.exe")
  console.log("   Kimi taught and closed\n")

  await runBatch([{ action: "click", x: 300, y: 500, delay: 200 }])
  await runBatch([{ action: "snap_left", delay: 500 }])

  // ===== TEACH BLENDER =====
  await openAndSnapApp("Blender", "blender")
  console.log("5. Learning Blender layout...")
  ss("blender-layout-full")
  await runBatch([{ action: "click", x: 1440, y: 400, delay: 500 }])
  ss("blender-viewport")
  await closeApp("blender.exe")
  await closeApp("Blender.exe")
  console.log("   Blender taught and closed\n")

  console.log("=== All 4 apps taught with proper split view! ===")
}

main().catch(e => console.error("Error:", e.message))
