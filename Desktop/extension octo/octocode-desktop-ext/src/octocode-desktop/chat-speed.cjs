// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
const { fork } = require("child_process")
const { execSync } = require("child_process")
const path = require("path")
const { getLayout, saveLayout } = require("./layout-cache.cjs")

const WORKER_PATH = path.join(__dirname, "..", "..", "tools", "nut-persistent-worker.cjs")

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
    const id = `batch-${Date.now()}-${_workerId}`
    const timeout = setTimeout(() => resolve({ success: false, error: "timeout" }), 15000)
    const handler = (msg) => {
      if (msg.id === id) {
        clearTimeout(timeout)
        w.removeListener("message", handler)
        resolve(msg)
      }
    }
    w.on("message", handler)
    w.on("error", (err) => {
      clearTimeout(timeout)
      _worker = null
      resolve({ success: false, error: err.message })
    })
    w.send({ id, batch: actions })
  })
}

function screenshot() {
  execSync(
    'powershell -File "C:\\Users\\Farhan\\Desktop\\extension octo\\octocode-desktop-ext\\browser\\screenshot.ps1"',
    { windowsHide: true, timeout: 5000 }
  )
}

async function chatMessage(appName, message, opts = {}) {
  const layout = getLayout(appName)
  const inputX = opts.inputX || (layout && layout.inputCoords ? layout.inputCoords.x : null)
  const inputY = opts.inputY || (layout && layout.inputCoords ? layout.inputCoords.y : null)

  if (!inputX || !inputY) {
    return { success: false, error: `No cached layout for "${appName}". Need input coordinates.` }
  }

  const actions = [
    { action: "click", x: inputX, y: inputY, delay: 200 },
    { action: "clip_paste", text: message, delay: 300 },
    { action: "key", key: "Enter", delay: 100 },
  ]

  return runBatch(actions)
}

async function openAndLayout(appName, opts = {}) {
  const { execSync: ex } = require("child_process")
  ex('cmd /c start "" "claude:"', { windowsHide: true })

  await new Promise(r => setTimeout(r, 4000))

  const actions = [
    { action: "snap_right", delay: 1500 },
  ]
  await runBatch(actions)

  screenshot()
  return { success: true, output: `${appName} opened and snapped` }
}

function destroyWorker() {
  if (_worker && !_worker.killed) {
    _worker.kill()
    _worker = null
  }
}

module.exports = { chatMessage, openAndLayout, runBatch, screenshot, getWorker, destroyWorker }
