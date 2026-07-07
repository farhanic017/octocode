import { $ } from "bun"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

interface SearchResult {
  title: string
  url: string
  snippet: string
}

interface ScrapeResult {
  title: string
  content: string
  url: string
}

let browserProc: any = null
let pendingMap = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
let idCounter = 0
let buffer = ""

function send(msg: Record<string, unknown>): Promise<any> {
  if (!browserProc) return Promise.reject(new Error("Browser not running"))
  const id = ++idCounter
  return new Promise((resolve, reject) => {
    pendingMap.set(id, { resolve, reject })
    browserProc.stdin!.write(JSON.stringify({ ...msg, id }) + "\n")
  })
}

async function ensureBrowser() {
  if (browserProc && browserProc.exitCode === null) return
  const globalRoot = (await $`npm root -g`.quiet().text()).trim()
  const serverPath = globalRoot + "/octocode-desktop-ext/src/octocode-desktop/browser-server.cjs"
  browserProc = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "pipe"] })
  browserProc.stdout!.on("data", (data: Buffer) => {
    buffer += data.toString()
    const lines = buffer.split("\n")
    buffer = lines.pop()!
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const msg = JSON.parse(line)
        const p = pendingMap.get(msg.id)
        if (p) {
          pendingMap.delete(msg.id)
          if (msg.error) p.reject(new Error(msg.error))
          else p.resolve(msg.result)
        }
      } catch {}
    }
  })
  browserProc.on("exit", () => {
    for (const p of pendingMap.values()) p.reject(new Error("Browser exited"))
    pendingMap.clear()
    browserProc = null
  })
}

async function navigate(url: string) {
  await ensureBrowser()
  return send({ action: "navigate", url })
}

async function evaluate(script: string) {
  await ensureBrowser()
  return send({ action: "evaluate", script })
}

async function screenshot(selector?: string) {
  await ensureBrowser()
  return send({ action: "screenshot", selector })
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    await navigate(`https://www.google.com/search?q=${encodeURIComponent(query)}`)
    const results = await evaluate(`
      Array.from(document.querySelectorAll('div.g')).slice(0, 8).map(el => {
        const a = el.querySelector('a')
        const h3 = el.querySelector('h3')
        const snippet = el.querySelector('[data-sncf], .VwiC3b, [style*="-webkit-line-clamp"]')
        return {
          title: h3?.textContent || '',
          url: a?.href || '',
          snippet: snippet?.textContent || ''
        }
      }).filter(r => r.url && r.title)
    `)
    return results || []
  } catch {
    return []
  }
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  try {
    await navigate(url)
    const result = await evaluate(`
      (() => {
        const title = document.title || ''
        const article = document.querySelector('article, main, [role="main"], .post-content, .entry-content, .markdown-body')
        let content = ''
        if (article) {
          content = article.innerText
        } else {
          content = document.body.innerText
        }
        content = content.slice(0, 8000)
        return { title, content, url: window.location.href }
      })()
    `)
    return result || { title: '', content: '', url }
  } catch {
    return { title: '', content: '', url }
  }
}

export async function searchTwitter(query: string): Promise<SearchResult[]> {
  try {
    await navigate(`https://nitter.net/search?f=tweets&q=${encodeURIComponent(query)}`)
    const results = await evaluate(`
      Array.from(document.querySelectorAll('.timeline-item')).slice(0, 5).map(el => {
        const content = el.querySelector('.tweet-content')?.textContent || ''
        const username = el.querySelector('.username')?.textContent || ''
        const link = el.querySelector('.tweet-link')?.getAttribute('href') || ''
        return {
          title: username,
          url: link.startsWith('http') ? link : 'https://nitter.net' + link,
          snippet: content.slice(0, 300)
        }
      }).filter(r => r.content)
    `)
    return results || []
  } catch {
    return []
  }
}

export async function searchReddit(query: string): Promise<SearchResult[]> {
  try {
    await navigate(`https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=relevance`)
    const results = await evaluate(`
      Array.from(document.querySelectorAll('shreddit-post, [data-testid="post-container"]')).slice(0, 5).map(el => {
        const title = el.querySelector('a[data-click-id="body"], h3')?.textContent || ''
        const snippet = el.querySelector('[slot="text-body"], .md')?.textContent || ''
        const link = el.querySelector('a[data-click-id="body"]')?.getAttribute('href') || ''
        const fullUrl = link.startsWith('http') ? link : 'https://reddit.com' + link
        return { title, url: fullUrl, snippet: snippet.slice(0, 300) }
      }).filter(r => r.title)
    `)
    return results || []
  } catch {
    return []
  }
}

export async function searchYouTube(query: string): Promise<SearchResult[]> {
  try {
    await navigate(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`)
    const results = await evaluate(`
      Array.from(document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderable')).slice(0, 5).map(el => {
        const title = el.querySelector('#video-title')?.textContent?.trim() || ''
        const channel = el.querySelector('#channel-name a, .ytd-channel-name a')?.textContent?.trim() || ''
        const href = el.querySelector('a#video-title, a#thumbnail')?.getAttribute('href') || ''
        const url = href.startsWith('http') ? href : 'https://www.youtube.com' + href
        return { title: channel + ': ' + title, url, snippet: '' }
      }).filter(r => r.title.trim() !== ': ')
    `)
    return results || []
  } catch {
    return []
  }
}

export async function getYouTubeTranscript(url: string): Promise<string> {
  try {
    await navigate(url)
    const result = await evaluate(`
      (() => {
        const panel = document.querySelector('ytd-transcript-renderer, ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]')
        if (!panel) return null
        const segments = panel.querySelectorAll('ytd-transcript-segment-renderer')
        return Array.from(segments).map(s => s.querySelector('.segment-text')?.textContent?.trim() || '').filter(Boolean).join(' ')
      })()
    `)
    return result || ''
  } catch {
    return ''
  }
}

export async function searchGitHub(query: string): Promise<SearchResult[]> {
  try {
    await navigate(`https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`)
    const results = await evaluate(`
      Array.from(document.querySelectorAll('.search-title, .Box-row a.v-align-middle')).slice(0, 5).map(el => {
        const title = el.textContent?.trim() || ''
        const href = el.getAttribute('href') || ''
        const url = href.startsWith('http') ? href : 'https://github.com' + href
        return { title, url, snippet: '' }
      }).filter(r => r.title)
    `)
    return results || []
  } catch {
    return []
  }
}

export async function fetchPage(url: string): Promise<string> {
  try {
    await navigate(url)
    return await evaluate(`
      (() => {
        const article = document.querySelector('article, main, [role="main"], .post-content, .markdown-body')
        return (article || document.body).innerText.slice(0, 10000)
      })()
    `)
  } catch {
    return ''
  }
}

export function cleanup() {
  if (browserProc) {
    browserProc.kill()
    browserProc = null
  }
}
