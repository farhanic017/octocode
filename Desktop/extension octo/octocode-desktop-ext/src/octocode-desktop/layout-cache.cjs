// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
const fs = require("fs")
const path = require("path")
const { getLayout: getKBLayout, learnLayout: learnKB } = require("./app-knowledge.cjs")

const CACHE_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".octocode", "layout-cache.json"
)

let _cache = null

function loadCache() {
  if (_cache) return _cache
  try { _cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) } catch { _cache = {} }
  return _cache
}

function saveCache() {
  try {
    const dir = path.dirname(CACHE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(CACHE_PATH, JSON.stringify(_cache, null, 2))
  } catch {}
}

function getLayout(appName) {
  const kbLayout = getKBLayout(appName)
  if (kbLayout) return kbLayout
  const cache = loadCache()
  return cache[appName.toLowerCase()] || null
}

function saveLayout(appName, description, inputCoords, elements) {
  const cache = loadCache()
  cache[appName.toLowerCase()] = { appName, description, inputCoords, elements: elements || [], lastSeen: Date.now() }
  saveCache()
  learnKB(appName, { description, coords: { right: inputCoords } })
}

function clearCache() { _cache = {}; saveCache() }

module.exports = { getLayout, saveLayout, clearCache }
