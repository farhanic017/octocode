import { chromium, type Browser, type Page } from "playwright"

let browser: Browser | null = null
let page: Page | null = null

export async function openPreview(url: string): Promise<{ title: string; url: string }> {
  if (page && !page.isClosed()) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 })
    const title = await page.title()
    return { title, url: page.url() }
  }

  browser = await chromium.launch({
    headless: false,
    args: [
      "--single-process",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-dev-shm-usage",
    ],
  })

  const ctx = browser.contexts()[0] || await browser.newContext()
  page = await ctx.newPage()
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })
  const title = await page.title()
  return { title, url: page.url() }
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

export async function closePreview(): Promise<void> {
  if (page && !page.isClosed()) await page.close().catch(() => {})
  if (browser && browser.isConnected()) await browser.close().catch(() => {})
  page = null
  browser = null
}

export async function isPreviewOpen(): Promise<boolean> {
  return page !== null && !page.isClosed() && browser !== null && browser.isConnected()
}
