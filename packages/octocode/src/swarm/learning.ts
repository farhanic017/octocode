import { Effect, Context, Layer, Schema } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { FSUtil } from "@octocode-ai/core/fs-util"
import path from "path"

export const PreferenceCategory = Schema.Literals([
  "taste",
  "preference",
  "choice",
  "mood",
  "workflow",
  "style",
  "constraint",
  "correction",
  "feedback",
])
export type PreferenceCategory = Schema.Schema.Type<typeof PreferenceCategory>

export const Preference = Schema.Struct({
  id: Schema.String,
  category: PreferenceCategory,
  key: Schema.String,
  value: Schema.String,
  confidence: Schema.Number,
  evidence: Schema.Array(Schema.String),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
  applyCount: Schema.Number,
  source: Schema.String,
})
export type Preference = Schema.Schema.Type<typeof Preference>

export const Lesson = Schema.Struct({
  id: Schema.String,
  agentName: Schema.String,
  context: Schema.String,
  outcome: Schema.String,
  lesson: Schema.String,
  tags: Schema.Array(Schema.String),
  success: Schema.Boolean,
  score: Schema.Number,
  timestamp: Schema.Number,
  applyCount: Schema.Number,
})
export type Lesson = Schema.Schema.Type<typeof Lesson>

interface PreferencesFile {
  preferences: Array<Omit<Preference, "id"> & { id?: string }>
  updatedAt: number
}

interface LessonsFile {
  lessons: Array<Omit<Lesson, "id"> & { id?: string }>
  updatedAt: number
}

export interface Interface {
  readonly logLesson: (input: {
    agentName: string
    context: string
    outcome: string
    lesson: string
    tags?: string[]
    success?: boolean
  }) => Effect.Effect<Lesson>
  readonly getRelevantLessons: (input: {
    agentName: string
    currentContext: string
    maxResults?: number
  }) => Effect.Effect<Lesson[]>
  readonly getLessonsForPrompt: (input: {
    agentName: string
    currentContext: string
    maxResults?: number
  }) => Effect.Effect<string>

  readonly recordPreference: (input: {
    category: PreferenceCategory
    key: string
    value: string
    confidence?: number
    evidence?: string[]
    source?: string
  }) => Effect.Effect<Preference>
  readonly extractPreferences: (input: {
    userMessage: string
    assistantResponse?: string
    agentName: string
  }) => Effect.Effect<Preference[]>
  readonly getPreferencesForPrompt: (input: {
    currentContext: string
    categories?: PreferenceCategory[]
    maxResults?: number
  }) => Effect.Effect<string>
  readonly getAllPreferences: (input?: {
    category?: PreferenceCategory
  }) => Effect.Effect<Preference[]>
  readonly updatePreference: (id: string, patches: Partial<Pick<Preference, "value" | "confidence" | "evidence">>) => Effect.Effect<Preference | null>

  readonly getStats: () => Effect.Effect<{
    totalLessons: number
    totalPreferences: number
    byAgent: Record<string, number>
    byCategory: Record<string, number>
    successRate: number
    totalApplies: number
  }>
  readonly pruneLowValue: (minScore?: number) => Effect.Effect<number>
}

export class Service extends Context.Service<Service, Interface>()("@octocode/SwarmLearning") {}

let globalIdCounter = 0

function generateId(): string {
  return (Date.now().toString(36) + (globalIdCounter++).toString(36)).slice(0, 12)
}

function scoreRelevance(lsn: Lesson, contextWords: Set<string>): number {
  const lessonText = `${lsn.context} ${lsn.tags.join(" ")}`.toLowerCase()
  const lessonWords = new Set(lessonText.split(/\s+/))

  let score = 0

  for (const word of contextWords) {
    if (lessonWords.has(word)) {
      score += 2
    }
  }

  for (const word of contextWords) {
    for (const lw of lessonWords) {
      if (word.length > 3 && lw.length > 3 && (word.includes(lw) || lw.includes(word))) {
        score += 1
      }
    }
  }

  if (score === 0 && lsn.success) return 0
  if (!lsn.success) score += 3
  score += Math.min(lsn.applyCount, 5)

  return score
}

function scorePreferenceRelevance(pref: Preference, contextWords: Set<string>, categoryBoost: Set<string>): number {
  const prefText = `${pref.key} ${pref.value} ${pref.evidence.join(" ")}`.toLowerCase()
  const prefWords = new Set(prefText.split(/\s+/))

  let score = 0

  for (const word of contextWords) {
    if (prefWords.has(word)) score += 2
    if (word.length > 3) {
      for (const pw of prefWords) {
        if (pw.length > 3 && (word.includes(pw) || pw.includes(word))) score += 1
      }
    }
  }

  if (categoryBoost.has(pref.category)) score += 4
  score += Math.min(pref.applyCount, 10)
  score += pref.confidence

  return score
}

const PREFERENCE_PATTERNS: Array<{
  category: PreferenceCategory
  patterns: Array<{ match: RegExp; extract: (m: RegExpMatchArray) => { key: string; value: string } | null }>
}> = [
  {
    category: "preference",
    patterns: [
      { match: /(?:i (?:prefer|like|want|need|always use|always want))\s+(.+)/i, extract: (m) => ({ key: "explicit_preference", value: m[1].trim() }) },
      { match: /(?:use|prefer|go with|switch to|stick with)\s+(.+?)(?:\s+for|\s+instead|\s+not|\s+but|\.|,|$)/i, extract: (m) => ({ key: "tool_choice", value: m[1].trim() }) },
      { match: /(?:don'?t|never|stop)\s+(?:use|do|try)\s+(.+)/i, extract: (m) => ({ key: "avoid", value: m[1].trim() }) },
    ],
  },
  {
    category: "taste",
    patterns: [
      { match: /(?:i (?:prefer|like|love|hate|despise))\s+(?:the\s+)?(.+?)(?:\s+style|\s+approach|\s+pattern|\.|,|$)/i, extract: (m) => ({ key: "style_preference", value: m[1].trim() }) },
      { match: /(?:keep it|make it|looks? more?)\s+(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "aesthetic", value: m[1].trim() }) },
      { match: /(?:minimal|verbose|concise|detailed|clean|simple|elegant)\s+(?:is|please|style|approach)/i, extract: (m) => ({ key: "code_style", value: m[0].trim() }) },
    ],
  },
  {
    category: "choice",
    patterns: [
      { match: /(?:let'?s|we should|go ahead and|i'?ll)\s+(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "decision", value: m[1].trim() }) },
      { match: /(?:actually|wait|no|change that|instead)\s*,?\s*(?:let'?s|use|do|try)\s+(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "changed_mind", value: m[1].trim() }) },
    ],
  },
  {
    category: "mood",
    patterns: [
      { match: /(?:hurry|urgent|asap|quickly|fast|no time|in a rush)/i, extract: () => ({ key: "urgency", value: "high" }) },
      { match: /(?:take your time|no rush|careful|thorough|deep dive|explor)/i, extract: () => ({ key: "urgency", value: "low" }) },
      { match: /(?:frustrated|annoyed|angry|this is broken|doesn'?t work|keeps failing)/i, extract: () => ({ key: "frustration", value: "high" }) },
      { match: /(?:awesome|great|perfect|love it|nice|well done|thank)/i, extract: () => ({ key: "satisfaction", value: "high" }) },
    ],
  },
  {
    category: "workflow",
    patterns: [
      { match: /(?:always|every time|make sure to|don'?t forget to|remember to)\s+(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "always_do", value: m[1].trim() }) },
      { match: /(?:before|after|when) (?:you|we|running|deploying|committing|pushing)\s+(.+?),?\s*(?:always|make sure|don'?t forget)\s+(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "conditional_step", value: `When ${m[1].trim()}: ${m[2].trim()}` }) },
    ],
  },
  {
    category: "constraint",
    patterns: [
      { match: /(?:don'?t|never|must not|shouldn'?t|avoid)\s+(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "prohibition", value: m[1].trim() }) },
      { match: /(?:must|have to|need to|required to|make sure)\s+(?:always\s+)?(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "requirement", value: m[1].trim() }) },
    ],
  },
  {
    category: "correction",
    patterns: [
      { match: /(?:no|wrong|incorrect|that'?s not|should be|actually it'?s|change it to)\s+(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "correction", value: m[1].trim() }) },
      { match: /(?:not what i (?:meant|wanted|asked for))\s*,?\s*(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "clarification", value: m[1].trim() }) },
    ],
  },
  {
    category: "style",
    patterns: [
      { match: /(?:typescript|javascript|python|rust|go|css|html)\s+(?:over|instead of|not)\s+(.+?)(?:\.|,|$)/i, extract: (m) => ({ key: "language_choice", value: m[0].trim() }) },
      { match: /(?:use (?:the |a )?)(.+?)\s+(?:library|framework|package|tool|approach|pattern|method)/i, extract: (m) => ({ key: "tech_choice", value: m[1].trim() }) },
    ],
  },
]

function extractPreferencesFromText(text: string, agentName: string): Array<{ category: PreferenceCategory; key: string; value: string; confidence: number; evidence: string }> {
  const results: Array<{ category: PreferenceCategory; key: string; value: string; confidence: number; evidence: string }> = []

  for (const group of PREFERENCE_PATTERNS) {
    for (const p of group.patterns) {
      const matches = text.matchAll(new RegExp(p.match.source, p.match.flags + "g"))
      for (const m of matches) {
        const extracted = p.extract(m)
        if (extracted && extracted.value.length > 2) {
          results.push({
            category: group.category,
            key: extracted.key,
            value: extracted.value,
            confidence: 0.6,
            evidence: m[0].slice(0, 200),
          })
        }
      }
    }
  }

  const lowerText = text.toLowerCase()
  const keywords: Record<PreferenceCategory, string[]> = {
    taste: ["like", "prefer", "love", "hate", "style", "aesthetic", "looks", "feel"],
    preference: ["want", "need", "use", "choose", "pick"],
    choice: ["let's", "we should", "go with", "decide"],
    mood: ["hurry", "careful", "frustrated", "happy", "urgent", "relax"],
    workflow: ["always", "never", "remember", "don't forget", "make sure"],
    style: ["typescript", "minimal", "verbose", "clean", "simple", "functional", "oop"],
    constraint: ["don't", "must not", "required", "must", "have to"],
    correction: ["no", "wrong", "actually", "change", "fix"],
    feedback: ["good", "bad", "great", "terrible", "love", "hate"],
  }

  for (const [cat, words] of Object.entries(keywords) as [PreferenceCategory, string[]][]) {
    const hits = words.filter((w) => lowerText.includes(w))
    if (hits.length >= 2 && !results.some((r) => r.category === cat)) {
      results.push({
        category: cat,
        key: "keyword_signal",
        value: hits.join(", "),
        confidence: 0.4,
        evidence: hits.join("; "),
      })
    }
  }

  return results
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fsys = yield* FSUtil.Service
    const MAX_LESSONS = 2000
    const MAX_PREFERENCES = 1000
    const MAX_INJECT = 5

    const getStoragePath = Effect.fn("SwarmLearning.getStoragePath")(function* () {
      const dir = yield* InstanceState.directory
      return path.join(dir, ".octocode", "swarm_lessons.json")
    })

    const getPreferencesPath = Effect.fn("SwarmLearning.getPreferencesPath")(function* () {
      const dir = yield* InstanceState.directory
      return path.join(dir, ".octocode", "swarm_preferences.json")
    })

    const loadLessons = Effect.fn("SwarmLearning.loadLessons")(function* (storagePath: string) {
      const exists = yield* fsys.existsSafe(storagePath).pipe(Effect.catch(() => Effect.succeed(false)))
      if (!exists) return [] as Lesson[]

      const content = yield* Effect.tryPromise({
        try: () => import("node:fs/promises").then((fs) => fs.readFile(storagePath, "utf-8")),
        catch: () => null as string | null,
      }).pipe(Effect.catch(() => Effect.succeed(null as string | null)))

      if (!content) return [] as Lesson[]

      try {
        const data = JSON.parse(content) as LessonsFile
        return (data.lessons ?? []).map((item) => ({
          id: item.id ?? generateId(),
          agentName: item.agentName ?? "",
          context: item.context ?? "",
          outcome: item.outcome ?? "",
          lesson: item.lesson ?? "",
          tags: item.tags ?? [],
          success: item.success ?? true,
          score: item.score ?? 1,
          timestamp: item.timestamp ?? Date.now(),
          applyCount: item.applyCount ?? 0,
        })) as Lesson[]
      } catch {
        return [] as Lesson[]
      }
    })

    const saveLessons = Effect.fn("SwarmLearning.saveLessons")(function* (
      storagePath: string,
      lessons: Lesson[],
    ) {
      yield* fsys.ensureDir(path.dirname(storagePath)).pipe(Effect.catch(() => Effect.succeed(undefined)))

      const data: LessonsFile = {
        lessons: lessons.map((l) => ({
          id: l.id,
          agentName: l.agentName,
          context: l.context,
          outcome: l.outcome,
          lesson: l.lesson,
          tags: l.tags,
          success: l.success,
          score: l.score,
          timestamp: l.timestamp,
          applyCount: l.applyCount,
        })),
        updatedAt: Date.now(),
      }

      yield* Effect.tryPromise({
        try: () =>
          import("node:fs/promises").then((fs) =>
            fs.writeFile(storagePath, JSON.stringify(data, null, 2), "utf-8"),
          ),
        catch: (err) => err,
      }).pipe(Effect.catch(() => Effect.succeed(undefined)))
    })

    const loadPreferences = Effect.fn("SwarmLearning.loadPreferences")(function* (storagePath: string) {
      const exists = yield* fsys.existsSafe(storagePath).pipe(Effect.catch(() => Effect.succeed(false)))
      if (!exists) return [] as Preference[]

      const content = yield* Effect.tryPromise({
        try: () => import("node:fs/promises").then((fs) => fs.readFile(storagePath, "utf-8")),
        catch: () => null as string | null,
      }).pipe(Effect.catch(() => Effect.succeed(null as string | null)))

      if (!content) return [] as Preference[]

      try {
        const data = JSON.parse(content) as PreferencesFile
        return (data.preferences ?? []).map((item) => ({
          id: item.id ?? generateId(),
          category: item.category ?? "preference",
          key: item.key ?? "",
          value: item.value ?? "",
          confidence: item.confidence ?? 0.5,
          evidence: item.evidence ?? [],
          createdAt: item.createdAt ?? Date.now(),
          updatedAt: item.updatedAt ?? Date.now(),
          applyCount: item.applyCount ?? 0,
          source: item.source ?? "unknown",
        })) as Preference[]
      } catch {
        return [] as Preference[]
      }
    })

    const savePreferences = Effect.fn("SwarmLearning.savePreferences")(function* (
      storagePath: string,
      preferences: Preference[],
    ) {
      yield* fsys.ensureDir(path.dirname(storagePath)).pipe(Effect.catch(() => Effect.succeed(undefined)))

      const data: PreferencesFile = {
        preferences: preferences.map((p) => ({
          id: p.id,
          category: p.category,
          key: p.key,
          value: p.value,
          confidence: p.confidence,
          evidence: p.evidence,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          applyCount: p.applyCount,
          source: p.source,
        })),
        updatedAt: Date.now(),
      }

      yield* Effect.tryPromise({
        try: () =>
          import("node:fs/promises").then((fs) =>
            fs.writeFile(storagePath, JSON.stringify(data, null, 2), "utf-8"),
          ),
        catch: (err) => err,
      }).pipe(Effect.catch(() => Effect.succeed(undefined)))
    })

    const logLesson = Effect.fn("SwarmLearning.logLesson")(function* (input: {
      agentName: string
      context: string
      outcome: string
      lesson: string
      tags?: string[]
      success?: boolean
    }) {
      const storagePath = yield* getStoragePath()
      const lessons = yield* loadLessons(storagePath)

      const newLesson: Lesson = {
        id: generateId(),
        agentName: input.agentName,
        context: input.context.slice(0, 200),
        outcome: input.outcome.slice(0, 200),
        lesson: input.lesson.slice(0, 500),
        tags: input.tags ?? [],
        success: input.success ?? true,
        score: 1,
        timestamp: Date.now(),
        applyCount: 0,
      }

      lessons.push(newLesson)
      if (lessons.length > MAX_LESSONS) {
        lessons.splice(0, lessons.length - MAX_LESSONS)
      }

      yield* saveLessons(storagePath, lessons)
      return newLesson
    })

    const getRelevantLessons = Effect.fn("SwarmLearning.getRelevantLessons")(function* (input: {
      agentName: string
      currentContext: string
      maxResults?: number
    }) {
      const maxResults = input.maxResults ?? MAX_INJECT
      const storagePath = yield* getStoragePath()
      const lessons = yield* loadLessons(storagePath)
      const contextWords = new Set(input.currentContext.toLowerCase().split(/\s+/))

      const scored: Array<{ score: number; lesson: Lesson }> = []

      for (const lsn of lessons) {
        if (lsn.agentName !== input.agentName && lsn.agentName !== "*") continue

        const relScore = scoreRelevance(lsn, contextWords)
        if (relScore > 0) {
          scored.push({ score: relScore, lesson: lsn })
        }
      }

      scored.sort((a, b) => b.score - a.score)
      return scored.slice(0, maxResults).map((s) => ({
        ...s.lesson,
        applyCount: s.lesson.applyCount + 1,
      }))
    })

    const getLessonsForPrompt = Effect.fn("SwarmLearning.getLessonsForPrompt")(function* (input: {
      agentName: string
      currentContext: string
      maxResults?: number
    }) {
      const lessons = yield* getRelevantLessons(input)
      if (lessons.length === 0) return ""

      const lines = ["=== Lessons Learned (from experience) ==="]
      for (const lsn of lessons) {
        const tagStr = lsn.tags.length > 0 ? `[${lsn.tags.join(", ")}]` : ""
        lines.push(
          `- ${lsn.lesson.slice(0, 200)} (context: ${lsn.context.slice(0, 50)}... applied ${lsn.applyCount}x) ${tagStr}`,
        )
      }
      return lines.join("\n")
    })

    const recordPreference = Effect.fn("SwarmLearning.recordPreference")(function* (input: {
      category: PreferenceCategory
      key: string
      value: string
      confidence?: number
      evidence?: string[]
      source?: string
    }) {
      const storagePath = yield* getPreferencesPath()
      const preferences = yield* loadPreferences(storagePath)

      const existing = preferences.find(
        (p) => p.category === input.category && p.key === input.key,
      )

      if (existing) {
        const updated: Preference = {
          ...existing,
          value: input.value,
          confidence: Math.min(1, Math.max(existing.confidence, input.confidence ?? 0.6)),
          evidence: [...new Set([...existing.evidence, ...(input.evidence ?? [])])].slice(-5),
          updatedAt: Date.now(),
          applyCount: existing.applyCount + 1,
        }
        const idx = preferences.indexOf(existing)
        preferences[idx] = updated
        yield* savePreferences(storagePath, preferences)
        return updated
      }

      const newPref: Preference = {
        id: generateId(),
        category: input.category,
        key: input.key,
        value: input.value,
        confidence: input.confidence ?? 0.6,
        evidence: input.evidence ?? [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        applyCount: 0,
        source: input.source ?? "conversation",
      }

      preferences.push(newPref)
      if (preferences.length > MAX_PREFERENCES) {
        preferences.sort((a, b) => a.confidence - b.confidence)
        preferences.splice(0, preferences.length - MAX_PREFERENCES)
      }

      yield* savePreferences(storagePath, preferences)
      return newPref
    })

    const extractPreferences = Effect.fn("SwarmLearning.extractPreferences")(function* (input: {
      userMessage: string
      assistantResponse?: string
      agentName: string
    }) {
      const extracted = extractPreferencesFromText(input.userMessage, input.agentName)
      const results: Preference[] = []

      for (const ext of extracted) {
        const pref = yield* recordPreference({
          category: ext.category,
          key: ext.key,
          value: ext.value,
          confidence: ext.confidence,
          evidence: [ext.evidence],
          source: input.agentName,
        })
        results.push(pref)
      }

      if (input.assistantResponse) {
        const feedbackExtracted = extractPreferencesFromText(input.assistantResponse, input.agentName)
        for (const ext of feedbackExtracted) {
          if (ext.category === "feedback" || ext.category === "correction") {
            const pref = yield* recordPreference({
              category: ext.category,
              key: ext.key,
              value: ext.value,
              confidence: ext.confidence * 0.8,
              evidence: [ext.evidence],
              source: `${input.agentName}/feedback`,
            })
            results.push(pref)
          }
        }
      }

      return results
    })

    const getPreferencesForPrompt = Effect.fn("SwarmLearning.getPreferencesForPrompt")(function* (input: {
      currentContext: string
      categories?: PreferenceCategory[]
      maxResults?: number
    }) {
      const maxResults = input.maxResults ?? 15
      const storagePath = yield* getPreferencesPath()
      const preferences = yield* loadPreferences(storagePath)
      const contextWords = new Set(input.currentContext.toLowerCase().split(/\s+/))
      const categoryBoost = new Set(input.categories ?? [])

      const filtered = input.categories
        ? preferences.filter((p) => input.categories!.includes(p.category))
        : preferences

      const scored = filtered
        .map((p) => ({ score: scorePreferenceRelevance(p, contextWords, categoryBoost), pref: p }))
        .filter((s) => s.score > 0 || s.pref.confidence >= 0.8)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)

      if (scored.length === 0) return ""

      const byCategory = new Map<string, Preference[]>()
      for (const { pref } of scored) {
        if (!byCategory.has(pref.category)) byCategory.set(pref.category, [])
        byCategory.get(pref.category)!.push(pref)
      }

      const CATEGORY_LABELS: Record<string, string> = {
        taste: "Taste & Style",
        preference: "Preferences",
        choice: "Decisions Made",
        mood: "Current Mood",
        workflow: "Workflow Rules",
        style: "Code Style",
        constraint: "Constraints",
        correction: "Corrections",
        feedback: "Feedback",
      }

      const lines: string[] = ["=== User Profile (learned from conversations) ==="]
      for (const [cat, prefs] of byCategory) {
        lines.push(`\n[${CATEGORY_LABELS[cat] ?? cat}]`)
        for (const p of prefs) {
          const conf = p.confidence >= 0.8 ? " *" : ""
          const repeats = p.applyCount > 0 ? ` (repeated ${p.applyCount}x)` : ""
          lines.push(`- ${p.key}: ${p.value}${conf}${repeats}`)
        }
      }

      return lines.join("\n")
    })

    const getAllPreferences = Effect.fn("SwarmLearning.getAllPreferences")(function* (input?: {
      category?: PreferenceCategory
    }) {
      const storagePath = yield* getPreferencesPath()
      const preferences = yield* loadPreferences(storagePath)
      if (input?.category) return preferences.filter((p) => p.category === input.category)
      return preferences
    })

    const updatePreference = Effect.fn("SwarmLearning.updatePreference")(function* (
      id: string,
      patches: Partial<Pick<Preference, "value" | "confidence" | "evidence">>,
    ) {
      const storagePath = yield* getPreferencesPath()
      const preferences = yield* loadPreferences(storagePath)
      const idx = preferences.findIndex((p) => p.id === id)
      if (idx === -1) return null

      const existing = preferences[idx]
      const updated: Preference = {
        ...existing,
        value: patches.value ?? existing.value,
        confidence: patches.confidence ?? existing.confidence,
        evidence: patches.evidence ?? existing.evidence,
        updatedAt: Date.now(),
      }
      preferences[idx] = updated
      yield* savePreferences(storagePath, preferences)
      return updated
    })

    const getStats = Effect.fn("SwarmLearning.getStats")(function* () {
      const lessonsPath = yield* getStoragePath()
      const prefsPath = yield* getPreferencesPath()
      const lessons = yield* loadLessons(lessonsPath)
      const preferences = yield* loadPreferences(prefsPath)

      const byAgent: Record<string, number> = {}
      let successes = 0
      let totalApplies = 0

      for (const lsn of lessons) {
        byAgent[lsn.agentName] = (byAgent[lsn.agentName] ?? 0) + 1
        if (lsn.success) successes++
        totalApplies += lsn.applyCount
      }

      const byCategory: Record<string, number> = {}
      for (const pref of preferences) {
        byCategory[pref.category] = (byCategory[pref.category] ?? 0) + 1
      }

      return {
        totalLessons: lessons.length,
        totalPreferences: preferences.length,
        byAgent,
        byCategory,
        successRate: lessons.length > 0 ? successes / lessons.length : 0,
        totalApplies,
      }
    })

    const pruneLowValue = Effect.fn("SwarmLearning.pruneLowValue")(function* (minScore = 2) {
      const lessonsPath = yield* getStoragePath()
      const lessons = yield* loadLessons(lessonsPath)
      const before = lessons.length
      const filtered = lessons.filter((l) => l.score >= minScore)
      yield* saveLessons(lessonsPath, filtered)
      return before - filtered.length
    })

    return Service.of({
      logLesson,
      getRelevantLessons,
      getLessonsForPrompt,
      recordPreference,
      extractPreferences,
      getPreferencesForPrompt,
      getAllPreferences,
      updatePreference,
      getStats,
      pruneLowValue,
    })
  }),
)

export * as SwarmLearning from "./learning"
