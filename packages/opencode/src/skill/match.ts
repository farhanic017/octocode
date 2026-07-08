import type { Info } from "."

export interface SkillMatch {
  skill: Info
  score: number
  active?: boolean
  callCount?: number
  relevance?: number
  stale?: boolean
}

const SYNONYM_MAP: Record<string, string[]> = {
  database: ["db", "sql", "postgres", "supabase", "storage", "query", "data", "table", "migration"],
  auth: ["authentication", "login", "signin", "signup", "oauth", "jwt", "session", "user", "password"],
  frontend: ["ui", "ux", "web", "interface", "react", "component", "layout", "responsive", "css", "html"],
  backend: ["server", "api", "endpoint", "function", "edge", "cloud", "runtime"],
  animation: ["motion", "gsap", "animate", "transition", "scroll", "timeline", "tween", "easing", "spring"],
  design: ["ui", "ux", "visual", "brand", "style", "theme", "color", "typography", "layout", "css"],
  browser: ["web", "chrome", "playwright", "puppeteer", "cdp", "automation", "navigation", "page"],
  test: ["testing", "qa", "spec", "assert", "verify", "check", "lint", "audit"],
  deploy: ["publish", "release", "ship", "production", "ci", "cd", "function", "edge"],
  security: ["secure", "auth", "permission", "rbac", "policy", "encrypt", "token", "jwt"],
  mobile: ["ios", "android", "react-native", "swift", "kotlin", "app"],
  data: ["chart", "graph", "visualization", "d3", "dashboard", "analytics", "metric"],
  image: ["photo", "picture", "screenshot", "canvas", "svg", "png", "jpeg", "render", "visual"],
  video: ["mp4", "webm", "mov", "remotion", "frame", "animation", "scene", "timeline"],
  search: ["find", "query", "index", "retrieve", "discover", "lookup"],
  network: ["fetch", "api", "http", "request", "ajax", "websocket", "rest", "endpoint"],
  state: ["store", "reactive", "signal", "context", "redux", "recoil", "zustand"],
  prompt: ["llm", "ai", "instruction", "template", "generation", "text"],
  document: ["docx", "word", "pdf", "file", "report", "letter"],
  automation: ["script", "workflow", "pipeline", "task", "schedule", "cron", "bot"],
  sales: ["crm", "lead", "prospect", "outreach", "customer", "revenue", "pipeline"],
  marketing: ["campaign", "seo", "analytics", "content", "brand", "social"],
  icon: ["svg", "vector", "symbol", "glyph", "logo"],
  typography: ["font", "type", "text", "readability", "typeface"],
}

function buildReverseSynonymMap(): Record<string, string[]> {
  const rev: Record<string, string[]> = {}
  for (const [key, vals] of Object.entries(SYNONYM_MAP)) {
    for (const v of vals) {
      if (!rev[v]) rev[v] = []
      if (!rev[v].includes(key)) rev[v].push(key)
    }
  }
  return rev
}

const REVERSE_SYNONYM_MAP = buildReverseSynonymMap()

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function tokenize(str: string): string[] {
  const tokens: string[] = []
  const normalized = normalize(str)
  const words = normalized.split(/\s+/).filter((t) => t.length > 0)
  for (const w of words) {
    tokens.push(w)
    if (w.includes("-") || w.includes("_") || w.includes("/")) {
      const parts = w.split(/[-_/]/).filter((p) => p.length > 1)
      for (const p of parts) {
        if (!tokens.includes(p)) tokens.push(p)
      }
    }
  }
  return [...new Set(tokens)]
}

export function expandSynonyms(tokens: string[]): string[] {
  const expanded: string[] = []
  for (const t of tokens) {
    expanded.push(t)
    const fwd = SYNONYM_MAP[t]
    if (fwd) for (const s of fwd) { if (!expanded.includes(s)) expanded.push(s) }
    const rev = REVERSE_SYNONYM_MAP[t]
    if (rev) for (const s of rev) { if (!expanded.includes(s)) expanded.push(s) }
    if (rev) {
      for (const rk of rev) {
        const fwd2 = SYNONYM_MAP[rk]
        if (fwd2) for (const s of fwd2) { if (!expanded.includes(s)) expanded.push(s) }
      }
    }
  }
  return [...new Set(expanded)]
}

export function matchToken(token: string, text: string): number {
  if (!text) return 0
  const words = text.split(/\s+/)
  for (const w of words) {
    if (w === token) return 1.0
  }
  if (token.length >= 2) {
    for (const w of words) {
      if (w.includes(token)) return 0.8
      if (w.startsWith(token) || token.startsWith(w)) return 0.7
    }
  }
  return 0
}

export function computeSmartScore(skill: Info, tokens: string[], expandedTokens: string[]): number {
  if (tokens.length === 0) return 0

  const nameNorm = normalize(skill.name)
  const descNorm = normalize(skill.description || "")

  let totalScore = 0
  const matchedTokens = new Set<string>()

  for (const token of tokens) {
    let tokenScore = 0

    const nameHit = matchToken(token, nameNorm)
    if (nameHit > 0) tokenScore = Math.max(tokenScore, nameHit * 3)

    const descHit = matchToken(token, descNorm)
    if (descHit > 0) tokenScore = Math.max(tokenScore, descHit * 1)

    if (tokenScore === 0) {
      for (const exp of expandedTokens) {
        if (exp === token) continue
        const synNameHit = matchToken(exp, nameNorm)
        if (synNameHit > 0) {
          tokenScore = Math.max(tokenScore, synNameHit * 1.2)
          break
        }
        const synDescHit = matchToken(exp, descNorm)
        if (synDescHit > 0) {
          tokenScore = Math.max(tokenScore, synDescHit * 0.9)
          break
        }
      }
    }

    if (tokenScore > 0) {
      matchedTokens.add(token)
      totalScore += tokenScore
    }
  }

  const matchRatio = matchedTokens.size / tokens.length
  if (matchRatio >= 0.8 && tokens.length > 1) totalScore *= 1.3
  if (matchRatio >= 1.0 && tokens.length > 1) totalScore *= 1.15

  return Math.round(totalScore * 100) / 100
}

export function computeRelevance(skill: Info, contextNorm: string): number {
  const candidates = [skill.name, skill.description]
    .filter(Boolean)
    .map(normalize)
    .filter((s) => s.length > 0)
  if (candidates.length === 0) return 0
  const contextTokens = new Set(contextNorm.split(/\s+/).filter((t) => t.length > 2))
  let matchScore = 0
  for (const candidate of candidates) {
    const candidateTokens = candidate.split(/\s+/).filter((t) => t.length > 2)
    for (const ct of candidateTokens) {
      if (contextTokens.has(ct)) {
        matchScore += 1
        continue
      }
      for (const ctxToken of contextTokens) {
        if (ct.includes(ctxToken) || ctxToken.includes(ct)) {
          matchScore += 0.5
          break
        }
      }
    }
  }
  return Math.min(matchScore / Math.max(candidates.length, 1), 1)
}

export type ActiveMeta = { loadedAt: number; callCount: number; lastUsedAt: number }

export function matchSkills(
  skills: Info[],
  query: string,
  active?: Map<string, ActiveMeta>,
): SkillMatch[] {
  const tokens = query && query.trim() ? tokenize(query) : []
  const expandedTokens = tokens.length > 0 ? expandSynonyms(tokens) : []

  const scored = skills.map((s) => {
    let score = tokens.length > 0 ? computeSmartScore(s, tokens, expandedTokens) : 0
    const isActive = active?.has(s.name) ?? false
    const meta = isActive ? active!.get(s.name)! : undefined

    if (isActive && meta) {
      score *= 1.5
      score += Math.min(meta.callCount * 0.1, 2.0)
    }

    return {
      skill: s,
      score: Math.round(score * 100) / 100,
      active: isActive,
      callCount: meta?.callCount,
    }
  })

  return scored.sort((a, b) => b.score - a.score)
}
