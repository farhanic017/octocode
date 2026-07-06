import { chromium, type Browser, type Page } from "playwright"

let browser: Browser | null = null
let page: Page | null = null
let currentUrl = ""

export async function startPreview(url: string): Promise<{ title: string; url: string }> {
  if (page && !page.isClosed() && browser?.isConnected()) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 })
    currentUrl = url
    const title = await page.title()
    return { title, url }
  }

  browser = await chromium.launch({
    headless: false,
    args: [
      "--single-process",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  })

  const ctx = browser.contexts()[0] || await browser.newContext()
  page = await ctx.newPage()

  page.on("crash", () => {
    page = null
    browser = null
  })

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })
  currentUrl = url
  const title = await page.title()
  return { title, url }
}

export async function reloadPreview(): Promise<void> {
  if (!page || page.isClosed()) return
  await page.reload({ waitUntil: "domcontentloaded" })
}

export async function screenshotPreview(selector?: string): Promise<{ base64: string; size: number }> {
  if (!page || page.isClosed()) throw new Error("No preview open")
  let buf: Buffer
  if (selector) {
    const el = await page.$(selector)
    buf = el ? await el.screenshot() : await page.screenshot({ type: "png" })
  } else {
    buf = await page.screenshot({ type: "png" })
  }
  return { base64: buf.toString("base64"), size: buf.length }
}

export async function evaluatePreview(script: string): Promise<unknown> {
  if (!page || page.isClosed()) throw new Error("No preview open")
  return page.evaluate(script)
}

export async function waitForStable(ms = 500): Promise<void> {
  if (!page || page.isClosed()) return
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, ms))
}

export async function stopPreview(): Promise<void> {
  if (page && !page.isClosed()) await page.close().catch(() => {})
  if (browser && browser.isConnected()) await browser.close().catch(() => {})
  page = null
  browser = null
  currentUrl = ""
}

export async function isPreviewActive(): Promise<boolean> {
  return page !== null && !page.isClosed() && browser !== null && browser.isConnected()
}

export async function getCurrentUrl(): Promise<string> {
  return currentUrl
}
