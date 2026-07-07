export class LoopDetector {
  private threshold: number
  private handoffHistory: Array<[string, string]>
  private pairCounts: Map<string, number>

  constructor(threshold: number = 3) {
    this.threshold = threshold
    this.handoffHistory = []
    this.pairCounts = new Map()
  }

  recordHandoff(from: string, to: string): void {
    this.handoffHistory.push([from, to])
    const key = `${from}->${to}`
    this.pairCounts.set(key, (this.pairCounts.get(key) ?? 0) + 1)
  }

  isLooping(): boolean {
    if (this.handoffHistory.length < this.threshold) return false

    const last = this.handoffHistory.slice(-this.threshold)
    const firstPair = `${last[0][0]}->${last[0][1]}`
    if (last.every(([f, t]) => `${f}->${t}` === firstPair)) return true

    const lastHandoff = this.handoffHistory[this.handoffHistory.length - 1]
    const lastKey = `${lastHandoff[0]}->${lastHandoff[1]}`
    const count = this.pairCounts.get(lastKey) ?? 0
    if (count >= this.threshold) return true

    return false
  }

  detectCycle(): string[] {
    if (this.handoffHistory.length < 4) return []

    const recent = this.handoffHistory.slice(-6)
    for (let patternLen = 2; patternLen <= Math.floor(recent.length / 2); patternLen++) {
      const pattern = recent.slice(-patternLen)
      let isRepeating = true
      for (let i = 0; i < patternLen && i + patternLen < recent.length; i++) {
        if (recent[i][0] !== recent[i + patternLen][0] || recent[i][1] !== recent[i + patternLen][1]) {
          isRepeating = false
          break
        }
      }
      if (isRepeating) return pattern.map(([f, t]) => `${f}->${t}`)
    }

    return []
  }

  summary(): string {
    const last = this.handoffHistory.slice(-10)
    if (last.length === 0) return "No handoffs yet"
    return last.map(([f, t]) => `${f}->${t}`).join(" -> ")
  }

  reset(): void {
    this.handoffHistory = []
    this.pairCounts.clear()
  }
}
