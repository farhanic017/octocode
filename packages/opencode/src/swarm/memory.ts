import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"

export type MemoryType = "event" | "task" | "prediction" | "knowledge" | "lesson" | "state"

export interface MemoryEntry {
  id: string
  type: MemoryType
  agent: string
  content: string
  metadata: Record<string, unknown>
  timestamp: number
  confidence: number
  tags: string[]
  relatedTo: string[]
}

export class SharedMemory {
  private entries: MemoryEntry[]
  private maxEntries: number
  private counter: number
  private storagePath: string

  constructor(storagePath?: string) {
    this.entries = []
    this.maxEntries = 10000
    this.counter = 0
    this.storagePath = storagePath ?? join(process.cwd(), ".octocode", "memory.json")
    this.load()
  }

  store(
    type: MemoryType,
    agent: string,
    content: string,
    options: {
      metadata?: Record<string, unknown>
      confidence?: number
      tags?: string[]
      relatedTo?: string[]
    } = {},
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem_${++this.counter}_${Date.now()}`,
      type,
      agent,
      content,
      metadata: options.metadata ?? {},
      timestamp: Date.now(),
      confidence: options.confidence ?? 1.0,
      tags: options.tags ?? [],
      relatedTo: options.relatedTo ?? [],
    }
    this.entries.push(entry)

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }

    this.save()
    return entry
  }

  query(options: {
    type?: MemoryType
    agent?: string
    tags?: string[]
    limit?: number
    search?: string
  } = {}): MemoryEntry[] {
    let results = this.entries

    if (options.type) {
      results = results.filter((e) => e.type === options.type)
    }
    if (options.agent) {
      results = results.filter((e) => e.agent === options.agent)
    }
    if (options.tags && options.tags.length > 0) {
      results = results.filter((e) => options.tags!.some((t) => e.tags.includes(t)))
    }
    if (options.search) {
      const query = options.search.toLowerCase()
      results = results.filter((e) => e.content.toLowerCase().includes(query))
    }

    results.sort((a, b) => b.timestamp - a.timestamp)

    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  getRecent(limit: number = 20): MemoryEntry[] {
    return this.entries
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  getAgentState(agent: string): Record<string, unknown> {
    const agentEntries = this.entries.filter((e) => e.agent === agent)
    const tasks = agentEntries.filter((e) => e.type === "task").length
    const events = agentEntries.filter((e) => e.type === "event").length
    const lastActivity = agentEntries.length > 0
      ? agentEntries.sort((a, b) => b.timestamp - a.timestamp)[0].timestamp
      : null

    return {
      agent,
      taskCount: tasks,
      eventCount: events,
      lastActivity,
    }
  }

  getAllAgentStates(): Record<string, Record<string, unknown>> {
    const agents = new Set(this.entries.map((e) => e.agent))
    const states: Record<string, Record<string, unknown>> = {}
    for (const agent of agents) {
      states[agent] = this.getAgentState(agent)
    }
    return states
  }

  getSummary(): { total: number; typeCounts: Record<string, number>; agents: string[] } {
    const typeCounts: Record<string, number> = {}
    const agents = new Set<string>()
    for (const e of this.entries) {
      typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1
      agents.add(e.agent)
    }
    return {
      total: this.entries.length,
      typeCounts,
      agents: Array.from(agents),
    }
  }

  getPredictions(agent?: string): MemoryEntry[] {
    return this.entries
      .filter((e) => e.type === "prediction" && (!agent || e.agent === agent))
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  clear(): void {
    this.entries = []
    this.counter = 0
    this.save()
  }

  save(): void {
    try {
      const dir = dirname(this.storagePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(this.storagePath, JSON.stringify(this.entries, null, 2))
    } catch {}
  }

  private load(): void {
    try {
      if (existsSync(this.storagePath)) {
        const data = JSON.parse(readFileSync(this.storagePath, "utf-8"))
        if (Array.isArray(data)) this.entries = data
      }
    } catch {}
  }
}
