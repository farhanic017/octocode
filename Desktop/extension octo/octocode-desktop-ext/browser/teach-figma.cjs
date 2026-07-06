const { fork } = require("child_process")
const { execSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")
const workerPath = path.join(__dirname, "..", "tools", "nut-persistent-worker.cjs")

function run(actions) {
  return new Promise(resolve => {
    const w = fork(workerPath, [], { stdio: ["pipe","pipe","pipe","ipc"] })
    const id = "a" + Date.now()
    w.on("message", m => { if(m.id===id) { w.kill(); resolve(m) } })
    setTimeout(() => { try{w.kill()}catch{}; resolve({success:false}) }, 15000)
    w.send({ id, batch: actions })
  })
}

function clipWrite(text) {
  const tmpFile = path.join(os.tmpdir(), "octo-clip.txt")
  fs.writeFileSync(tmpFile, text, "utf8")
  execSync(`powershell -Command "Set-Clipboard (Get-Content '${tmpFile}' -Raw)"`, { windowsHide: true, timeout: 3000 })
}

function ss(label) {
  execSync('powershell -File "C:\\Users\\Farhan\\Desktop\\extension octo\\octocode-desktop-ext\\browser\\screenshot.ps1"', { windowsHide: true, timeout: 5000 })
  console.log("  [" + label + "]")
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  // Step 1: Dismiss popup — click X button at top-right of popup
  console.log("1. Closing popup...")
  await run([{action:"click", x:1256, y:93, delay:500}])
  ss("popup-gone")

  // Step 2: The Coca-Cola text is selected. Let me select it and make it huge
  // Click on the text to select it
  console.log("2. Selecting text...")
  await run([{action:"click", x:1520, y:315, delay:500}])

  // Make font size 72pt via right panel — triple-click font size field, type new value
  // Font size is at right panel: current "12", need to change to "72"
  // The font size input is at approximately x=1735, y=705
  console.log("3. Setting font size to 72...")
  await run([{action:"click", x:1735, y:705, delay:300}])
  await run([
    {action:"key_combo", keys:["LeftControl","A"], delay:100},
    {action:"key", key:"Delete", delay:100},
  ])
  clipWrite("72")
  await sleep(300)
  await run([{action:"key_combo", keys:["LeftControl","V"], delay:200}])
  await run([{action:"key", key:"Enter", delay:500}])
  ss("font-72")

  // Step 4: Change font weight to Bold
  // Font weight dropdown is at right panel around x=1735, y=670 ("Regular")
  console.log("4. Changing to Bold...")
  await run([{action:"click", x:1735, y:670, delay:500}])
  // Type "Bold" to filter
  await run([{action:"type", text:"Bold", delay:500}])
  await run([{action:"key", key:"Enter", delay:500}])
  ss("bold-text")

  // Step 5: Change font — click font name dropdown (currently "Inter")
  // Font name is at right panel x=1735, y=640
  console.log("5. Changing font to a display font...")
  await run([{action:"click", x:1735, y:640, delay:500}])
  await run([{action:"type", text:"Playfair Display", delay:500}])
  await sleep(1000)
  await run([{action:"key", key:"Enter", delay:500}])
  ss("font-changed")

  // Step 6: Change text color to Coca-Cola red
  // Fill color is at right panel around x=1710, y=895 (currently "FFFFFF")
  console.log("6. Setting color to Coca-Cola red (#D62828)...")
  await run([{action:"click", x:1710, y: 895, delay:300}])
  await run([
    {action:"key_combo", keys:["LeftControl","A"], delay:100},
    {action:"key", key:"Delete", delay: 100},
  ])
  clipWrite("D62828")
  await sleep(300)
  await run([{action:"key_combo", keys:["LeftControl","V"], delay:200}])
  await run([{action:"key", key:"Enter", delay:500}])
  ss("red-text")

  // Step 7: Draw background rectangle
  console.log("7. Drawing background rectangle...")
  await run([{action:"key", key:"R", delay:300}])
  // Draw rectangle covering the whole canvas
  await run([{action:"drag", from_x:1250, from_y:100, to_x:1900, to_y:950, delay:500}])
  ss("bg-rect")

  // Step 8: Change rectangle fill to Coca-Cola red
  console.log("8. Setting background to red...")
  await run([{action:"click", x:1710, y: 895, delay:300}])
  await run([
    {action:"key_combo", keys:["LeftControl","A"], delay:100},
    {action:"key", key:"Delete", delay: 100},
  ])
  clipWrite("D62828")
  await sleep(300)
  await run([{action:"key_combo", keys:["LeftControl","V"], delay:200}])
  await run([{action:"key", key:"Enter", delay:500}])
  ss("red-bg")

  // Step 9: Send rectangle behind text — right click > Send to back
  // Or use shortcut: Ctrl+Shift+[ (send to back)
  console.log("9. Sending rectangle to back...")
  await run([{action:"key_combo", keys:["LeftControl","LeftShift","["], delay:500}])
  ss("sent-back")

  // Step 10: Click text to select it, then reposition to center
  console.log("10. Repositioning text...")
  await run([{action:"click", x:1520, y:500, delay:300}])

  // Take final screenshot
  await sleep(1000)
  ss("final-coca-cola")

  console.log("\nDone! Coca-Cola poster in Figma.")
}

main().catch(e => console.error(e.message))
