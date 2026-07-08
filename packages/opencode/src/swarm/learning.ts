import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

export interface Lesson {
  id: string
  agentName: string
  context: string
  outcome: string
  lesson: string
  tags: string[]
  success: boolean
  score: number
  timestamp: number
  applyCount: number
}

export class LessonLearner {
  private lessons: Lesson[]
  private maxLessons: number
  private maxInject: number
  private storagePath: string

  constructor(storagePath?: string) {
    this.lessons = []
    this.maxLessons = 2000
    this.maxInject = 5
    this.storagePath = storagePath ?? join(process.cwd(), ".octocode", "lessons.json")
    this.load()
  }

  logLesson(
    agentName: string,
    context: string,
    outcome: string,
    lesson: string,
    tags: string[] = [],
    success: boolean = true,
  ): Lesson {
    const entry: Lesson = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      agentName,
      context: context.slice(0, 200),
      outcome: outcome.slice(0, 200),
      lesson: lesson.slice(0, 500),
      tags,
      success,
      score: 1,
      timestamp: Date.now(),
      applyCount: 0,
    }
    this.lessons.push(entry)
    if (this.lessons.length > this.maxLessons) {
      this.lessons = this.lessons.slice(-this.maxLessons)
    }
    this.save()
    return entry
  }

  getRelevantLessons(agentName: string, currentContext: string, maxResults: number = 0): Lesson[] {
    const limit = maxResults || this.maxInject
    const contextWords = new Set(currentContext.toLowerCase().split(/\s+/).filter((w) => w.length > 1))

    const scored = this.lessons
      .filter((l) => l.agentName === agentName)
      .map((l) => ({
        lesson: l,
        score: this.scoreRelevance(l, contextWords),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, limit).map((s) => {
      s.lesson.applyCount++
      return s.lesson
    })
  }

  getLessonsForPrompt(agentName: string, currentContext: string, maxResults: number = 0): string {
    const relevant = this.getRelevantLessons(agentName, currentContext, maxResults)
    if (relevant.length === 0) return ""
    return relevant
      .map((l) => `- [${l.success ? "SUCCESS" : "FAILURE"}] ${l.lesson}`)
      .join("\n")
  }

  getStats(): { total: number; byAgent: Record<string, number>; successRate: number } {
    const byAgent: Record<string, number> = {}
    let successes = 0
    for (const l of this.lessons) {
      byAgent[l.agentName] = (byAgent[l.agentName] ?? 0) + 1
      if (l.success) successes++
    }
    return {
      total: this.lessons.length,
      byAgent,
      successRate: this.lessons.length > 0 ? successes / this.lessons.length : 0,
    }
  }

  pruneLowValue(minScore: number = 2): number {
    const before = this.lessons.length
    this.lessons = this.lessons.filter((l) => l.score >= minScore || l.applyCount > 0)
    this.save()
    return before - this.lessons.length
  }

  private scoreRelevance(lesson: Lesson, contextWords: Set<string>): number {
    const lessonWords = new Set(
      (lesson.context + " " + lesson.tags.join(" ")).toLowerCase().split(/\s+/).filter((w) => w.length > 1),
    )

    let score = 0
    for (const word of contextWords) {
      if (lessonWords.has(word)) score += 2
      for (const lw of lessonWords) {
        if (lw.length > 3 && word.length > 3 && (lw.includes(word) || word.includes(lw))) {
          score += 1
          break
        }
      }
    }

    if (score === 0 && lesson.success) return 0
    if (!lesson.success) score += 3
    score += Math.min(lesson.applyCount, 5)

    return score
  }

  private save(): void {
    try {
      const dir = this.storagePath.replace(/[/\\][^/\\]+$/, "")
      if (!existsSync(dir)) {
        const { mkdirSync } = require("fs")
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.storagePath, JSON.stringify(this.lessons, null, 2))
    } catch {}
  }

  private load(): void {
    try {
      if (existsSync(this.storagePath)) {
        const data = JSON.parse(readFileSync(this.storagePath, "utf-8"))
        if (Array.isArray(data)) this.lessons = data
      }
    } catch {}
  }
}
