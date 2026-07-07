export type ConsciousnessEventType =
  | "state_change"
  | "progress"
  | "artifact"
  | "error"
  | "diagnostic"
  | "completion"

export interface ConsciousnessEvent {
  id: string
  type: ConsciousnessEventType
  source: string
  payload: Record<string, unknown>
  timestamp: number
}

export class Consciousness {
  private liveState: Map<string, unknown>
  private artifacts: Map<string, unknown>
  private eventLog: ConsciousnessEvent[]
  private subscriptions: Map<string, Array<(event: ConsciousnessEvent) => void>>
  private maxEventLog: number
  private counter: number

  constructor() {
    this.liveState = new Map()
    this.artifacts = new Map()
    this.eventLog = []
    this.subscriptions = new Map()
    this.maxEventLog = 5000
    this.counter = 0
  }

  private makeId(): string {
    return (++this.counter).toString(36) + Math.random().toString(36).slice(2, 8)
  }

  private emit(event: ConsciousnessEvent): number {
    if (event.type === "state_change" && typeof event.payload.key === "string") {
      this.liveState.set(event.payload.key as string, event.payload.value)
    }
    if (event.type === "artifact" && typeof event.payload.key === "string") {
      this.artifacts.set(event.payload.key as string, event.payload.value)
    }

    this.eventLog.push(event)
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog = this.eventLog.slice(-this.maxEventLog)
    }

    let fanOut = 0
    const callbacks = this.subscriptions.get(event.type) ?? []
    for (const cb of callbacks) {
      cb(event)
      fanOut++
    }
    const wildcard = this.subscriptions.get("*") ?? []
    for (const cb of wildcard) {
      cb(event)
      fanOut++
    }
    return fanOut
  }

  pushState(key: string, value: unknown, source: string = "system"): ConsciousnessEvent {
    const event: ConsciousnessEvent = {
      id: this.makeId(),
      type: "state_change",
      source,
      payload: { key, value },
      timestamp: Date.now(),
    }
    this.emit(event)
    return event
  }

  pushProgress(source: string, message: string, detail?: string): ConsciousnessEvent {
    const event: ConsciousnessEvent = {
      id: this.makeId(),
      type: "progress",
      source,
      payload: { message, detail },
      timestamp: Date.now(),
    }
    this.emit(event)
    return event
  }

  pushArtifact(key: string, value: unknown, source: string = "system"): ConsciousnessEvent {
    const event: ConsciousnessEvent = {
      id: this.makeId(),
      type: "artifact",
      source,
      payload: { key, value },
      timestamp: Date.now(),
    }
    this.emit(event)
    return event
  }

  pushError(source: string, error: string, detail?: string): ConsciousnessEvent {
    const event: ConsciousnessEvent = {
      id: this.makeId(),
      type: "error",
      source,
      payload: { error, detail },
      timestamp: Date.now(),
    }
    this.emit(event)
    return event
  }

  pushCompletion(source: string, result: string, summary: string = ""): ConsciousnessEvent {
    const event: ConsciousnessEvent = {
      id: this.makeId(),
      type: "completion",
      source,
      payload: { result, summary },
      timestamp: Date.now(),
    }
    this.emit(event)
    return event
  }

  getState(key: string): unknown {
    return this.liveState.get(key)
  }

  getAllState(): Record<string, unknown> {
    return Object.fromEntries(this.liveState)
  }

  getArtifact(key: string): unknown {
    return this.artifacts.get(key)
  }

  getAllArtifacts(): Record<string, unknown> {
    return Object.fromEntries(this.artifacts)
  }

  getRecentSummary(maxEvents: number = 20): string {
    const recent = this.eventLog.slice(-maxEvents)
    const lines: string[] = []

    const progress = recent.filter((e) => e.type === "progress")
    if (progress.length > 0) {
      lines.push("Progress:")
      for (const e of progress.slice(-5)) {
        lines.push(`  [${e.source}] ${e.payload.message}`)
      }
    }

    const completions = recent.filter((e) => e.type === "completion")
    if (completions.length > 0) {
      lines.push("Completions:")
      for (const e of completions) {
        lines.push(`  [${e.source}] ${e.payload.result}`)
      }
    }

    const errors = recent.filter((e) => e.type === "error")
    if (errors.length > 0) {
      lines.push("Errors:")
      for (const e of errors) {
        lines.push(`  [${e.source}] ${e.payload.error}`)
      }
    }

    const stateEntries = Array.from(this.liveState.entries())
    if (stateEntries.length > 0) {
      lines.push("Live State:")
      for (const [k, v] of stateEntries.slice(0, 10)) {
        lines.push(`  ${k}: ${JSON.stringify(v).slice(0, 100)}`)
      }
    }

    return lines.join("\n")
  }

  getFullContextForSwitch(originalTask: string, maxEvents: number = 50): string {
    const lines: string[] = [
      `Original task: ${originalTask}`,
      "",
      "Artifacts produced:",
    ]

    for (const [k, v] of this.artifacts) {
      lines.push(`  ${k}: ${JSON.stringify(v).slice(0, 200)}`)
    }

    lines.push("")
    lines.push("Progress:")

    const recent = this.eventLog.slice(-maxEvents)
    for (const e of recent) {
      if (e.type === "progress") lines.push(`  [${e.source}] ${e.payload.message}`)
      if (e.type === "completion") lines.push(`  [${e.source}] DONE: ${e.payload.result}`)
      if (e.type === "error") lines.push(`  [${e.source}] ERROR: ${e.payload.error}`)
    }

    lines.push("")
    lines.push("State changes:")
    for (const [k, v] of this.liveState) {
      lines.push(`  ${k}: ${JSON.stringify(v).slice(0, 100)}`)
    }

    lines.push("")
    lines.push("DO NOT restart from scratch. Continue from the artifacts above.")

    return lines.join("\n")
  }

  subscribe(eventType: string, callback: (event: ConsciousnessEvent) => void): string {
    const id = this.makeId()
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, [])
    }
    this.subscriptions.get(eventType)!.push(callback)
    return id
  }

  unsubscribe(id: string): boolean {
    for (const [type, callbacks] of this.subscriptions) {
      const idx = callbacks.findIndex((_, i) => `${type}:${i}` === id)
      if (idx !== -1) {
        callbacks.splice(idx, 1)
        return true
      }
    }
    return false
  }
}
