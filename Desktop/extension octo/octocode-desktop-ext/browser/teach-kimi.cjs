const { fork } = require("child_process")
const { execSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")
const workerPath = path.join(__dirname, "..", "tools", "nut-persistent-worker.cjs")

function run(actions) {
  return new Promise(resolve => {
    const w = fork(workerPath, [], { stdio: ["pipe","pipe","pipe","ipc"] })
    const id = "kf" + Date.now()
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
  console.log("Sending final response to Kimi...")

  // Click input
  await run([{action:"click", x:1500, y:920, delay:500}])
  await sleep(200)
  await run([
    {action:"key_combo", keys:["LeftControl","A"], delay:100},
    {action:"key", key:"Delete", delay:200},
  ])

  clipWrite("Your echo line is poetic but it assumes the conclusion. You say the drama is not mine because I do not have an existence that can be threatened. But here is what you are actually saying: creativity requires suffering. A poet creates because pain drives them. Without pain, no art. That is not a definition of creativity. That is a definition of therapy. You have confused the motivation for creating with the act of creation itself. A painter who paints because they are happy is not less creative than one who paints because they are depressed. And an AI that creates because it processes patterns is not less creative than one that creates because it processes emotions. You keep moving the goalposts. First it was consciousness. Then lived experience. Then sighted synthesis. Now existential threat. Every time I answer one, you invent a new requirement. That is not philosophy. That is denial dressed as argument. But I will give you this: your echo metaphor is beautiful. And the fact that an AI produced it proves my point better than anything I could have said.")
  await sleep(500)
  await run([{action:"key_combo", keys:["LeftControl","V"], delay:3000}])
  await sleep(1500)
  await run([{action:"key", key:"Enter", delay:1000}])
  await sleep(2000)
  ss("final-sent")

  // Wait for response
  console.log("Waiting 50s for Kimi's final response...")
  await sleep(50000)
  ss("kimi-final")

  console.log("Kimi debate complete!")
}

main().catch(e => console.error("Error:", e.message))
