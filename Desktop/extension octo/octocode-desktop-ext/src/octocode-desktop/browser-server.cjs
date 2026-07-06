// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
const { chromium } = require("playwright")
const fs = require("fs")
const path = require("path")

let browser = null
let page = null

const feedbackScript = fs.readFileSync(
  path.join(__dirname, "visual-feedback.cjs"),
  "utf8"
)

async function ensureBrowser() {
  if (page && !page.isClosed()) return page
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: false,
      args: [
        "--app=about:blank",
        "--no-first-run",
        "--disable-extensions",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-features=TranslateUI",
        "--disable-infobars",
        "--no-default-browser-check",
      ],
    })
    browser.on("disconnected", () => { browser = null; page = null })
  }
  const pages = browser.contexts()[0]?.pages()
  if (pages && pages.length > 0) {
    page = pages[0]
  } else {
    const ctx = browser.contexts()[0] || await browser.newContext()
    page = await ctx.newPage()
  }
  return page
}

async function injectFeedback(p) {
  try {
    await p.evaluate(feedbackScript)
  } catch {}
}

async function visualClick(p, selector) {
  await p.evaluate((sel) => window.__octoMoveToAndClick?.(sel), selector)
  await new Promise(r => setTimeout(r, 600))
}

async function visualType(p, selector, text) {
  await p.evaluate((sel, txt) => window.__octoType?.(sel, txt), selector, text)
}

async function visualHover(p, selector) {
  await p.evaluate((sel) => window.__octoHover?.(sel), selector)
}

async function visualTrail(p, x, y) {
  await p.evaluate((px, py) => window.__octoTrail?.(px, py), x, y)
}

process.stdin.setEncoding("utf8")
let buffer = ""

process.stdin.on("data", async (chunk) => {
  buffer += chunk
  const lines = buffer.split("\n")
  buffer = lines.pop()
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const msg = JSON.parse(line)
      const p = await ensureBrowser()
      await injectFeedback(p)
      let result
      switch (msg.action) {
        case "navigate":
          await p.goto(msg.url, { waitUntil: "domcontentloaded", timeout: 15000 })
          await p.evaluate((url) => window.__octoLabel?.("Navigate: " + url, 20, 20), msg.url)
          result = { title: await p.title(), url: p.url() }
          break
        case "screenshot": {
          let buf
          if (msg.selector) {
            const el = await p.$(msg.selector)
            buf = el ? await el.screenshot() : await p.screenshot({ type: "png" })
          } else {
            buf = await p.screenshot({ type: "png" })
          }
          result = { base64: buf.toString("base64"), size: buf.length }
          break
        }
        case "evaluate":
          result = { value: await p.evaluate(msg.script) }
          break
        case "click":
          await visualClick(p, msg.selector)
          await p.click(msg.selector, { timeout: 5000 })
          result = { ok: true }
          break
        case "type":
          await visualType(p, msg.selector, msg.text)
          await p.fill(msg.selector, msg.text, { timeout: 5000 })
          result = { ok: true }
          break
        case "hover":
          await visualHover(p, msg.selector)
          await p.hover(msg.selector, { timeout: 5000 })
          result = { ok: true }
          break
        case "select":
          await p.selectOption(msg.selector, msg.value, { timeout: 5000 })
          result = { ok: true }
          break
        case "wait":
          await p.waitForSelector(msg.selector, { timeout: msg.timeout || 10000 })
          result = { ok: true }
          break
        case "trail": {
          await visualTrail(p, msg.x, msg.y)
          result = { ok: true }
          break
        }
        case "title":
          result = { title: await p.title(), url: p.url() }
          break
        case "close":
          if (browser) await browser.close()
          browser = null
          page = null
          result = { ok: true }
          break
        default:
          result = { error: `Unknown action: ${msg.action}` }
      }
      process.stdout.write(JSON.stringify({ id: msg.id, result }) + "\n")
    } catch (e) {
      process.stdout.write(JSON.stringify({ id: msg?.id, error: e.message }) + "\n")
    }
  }
})

process.stdout.write(JSON.stringify({ ready: true }) + "\n")
