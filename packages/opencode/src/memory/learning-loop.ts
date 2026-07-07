import { Effect } from "effect"
import { Database } from "../storage"
import { EpisodicMemoryTable } from "./episodic.sql"
import { ProceduralMemoryTable } from "./procedural.sql"
import { eq, and, gte, desc, sql } from "drizzle-orm"

const COMPLEXITY_THRESHOLD = 3
const MIN_USES_FOR_CRYSTALLIZE = 2

export interface TaskReflection {
  sessionId: string
  taskType: string
  title: string
  summary: string
  filesChanged: string[]
  durationMs: number
  outcome: "success" | "failure"
  errorMessage?: string
  tags?: string[]
}

export interface CrystallizedSkill {
  skillName: string
  pattern: string
  description: string
  steps: string[]
  tags: string[]
  confidence: number
  sourceEpisodeIds: number[]
}

function estimateComplexity(task: TaskReflection): number {
  let score = 0
  if (task.filesChanged.length > 3) score += 2
  else if (task.filesChanged.length > 1) score += 1
  if (task.durationMs > 120000) score += 2
  else if (task.durationMs > 30000) score += 1
  if (task.tags && task.tags.length > 2) score += 1
  if (task.summary.length > 200) score += 1
  return score
}

function generateSkillPattern(task: TaskReflection): string {
  const exts = [...new Set(task.filesChanged.map((f) => f.split(".").pop()).filter(Boolean))]
  return `${task.taskType}:${exts.join(",")}`
}

export async function reflectOnTask(task: TaskReflection): Promise<{
  episodeId: number
  complexity: number
  crystallized: CrystallizedSkill | null
}> {
  const now = Date.now()
  const complexity = estimateComplexity(task)

  const episodeResult = await Database.use((db) =>
    db
      .insert(EpisodicMemoryTable)
      .values({
        timestamp: now,
        session_id: task.sessionId,
        task_type: task.taskType,
        outcome: task.outcome,
        title: task.title,
        summary: task.summary,
        details: JSON.stringify({
          filesChanged: task.filesChanged,
          complexity,
          durationMs: task.durationMs,
        }),
        tags: (task.tags || []).join(","),
        duration_ms: task.durationMs,
        files_changed: task.filesChanged.join(","),
        error_message: task.errorMessage || "",
        confidence: task.outcome === "success" ? 0.8 : 0.3,
      })
      .returning({ id: EpisodicMemoryTable.id }),
  )
  const episodeId = episodeResult[0].id

  if (task.outcome !== "success" || complexity < COMPLEXITY_THRESHOLD) {
    return { episodeId, complexity, crystallized: null }
  }

  const pattern = generateSkillPattern(task)
  const existing = await Database.use((db) =>
    db
      .select({ id: ProceduralMemoryTable.id, use_count: ProceduralMemoryTable.use_count })
      .from(ProceduralMemoryTable)
      .where(eq(ProceduralMemoryTable.pattern, pattern))
      .limit(1),
  )

  if (existing.length > 0) {
    await Database.use((db) =>
      db
        .update(ProceduralMemoryTable)
        .set({
          use_count: existing[0].use_count + 1,
          updated_at: now,
          last_used_at: now,
          confidence: Math.min(1.0, 0.5 + existing[0].use_count * 0.1),
        })
        .where(eq(ProceduralMemoryTable.id, existing[0].id)),
    )
    return { episodeId, complexity, crystallized: null }
  }

  const skillName = `${task.taskType}-${task.filesChanged.length}files-${Date.now()}`
  const skillResult = await Database.use((db) =>
    db
      .insert(ProceduralMemoryTable)
      .values({
        created_at: now,
        updated_at: now,
        skill_name: skillName,
        pattern,
        description: `Learned from task: ${task.title}. ${task.summary.slice(0, 300)}`,
        steps: JSON.stringify([
          `Task type: ${task.taskType}`,
          `Files involved: ${task.filesChanged.join(", ")}`,
          `Duration: ${Math.round(task.durationMs / 1000)}s`,
          `Summary: ${task.summary.slice(0, 200)}`,
        ]),
        tags: (task.tags || []).join(","),
        use_count: 1,
        success_rate: 1.0,
        scope: "project",
        source: "learned",
        confidence: 0.6,
        status: "draft",
      })
      .returning({ id: ProceduralMemoryTable.id }),
  )

  const crystallized: CrystallizedSkill = {
    skillName,
    pattern,
    description: `Learned from task: ${task.title}`,
    steps: [
      `Task type: ${task.taskType}`,
      `Files: ${task.filesChanged.join(", ")}`,
      `Summary: ${task.summary.slice(0, 200)}`,
    ],
    tags: task.tags || [],
    confidence: 0.6,
    sourceEpisodeIds: [episodeId],
  }

  return { episodeId, complexity, crystallized }
}

export async function getSuggestions(taskType: string): Promise<string[]> {
  const skills = await Database.use((db) =>
    db
      .select()
      .from(ProceduralMemoryTable)
      .where(
        and(
          eq(ProceduralMemoryTable.status, "active"),
          sql`${ProceduralMemoryTable.pattern} LIKE ${`%${taskType}%`}`,
        ),
      )
      .orderBy(desc(ProceduralMemoryTable.use_count))
      .limit(5),
  )

  return skills.map((s) => `[${s.skill_name}] ${s.description} (used ${s.use_count}x, ${Math.round(s.success_rate * 100)}% success)`)
}

export async function getStats() {
  const episodes = await Database.use((db) =>
    db.select({ count: sql<number>`count(*)` }).from(EpisodicMemoryTable),
  )
  const skills = await Database.use((db) =>
    db.select({ count: sql<number>`count(*)` }).from(ProceduralMemoryTable),
  )
  const activeSkills = await Database.use((db) =>
    db
      .select({ count: sql<number>`count(*)` })
      .from(ProceduralMemoryTable)
      .where(eq(ProceduralMemoryTable.status, "active")),
  )
  const learnedSkills = await Database.use((db) =>
    db
      .select({ count: sql<number>`count(*)` })
      .from(ProceduralMemoryTable)
      .where(eq(ProceduralMemoryTable.source, "learned")),
  )

  return {
    totalEpisodes: episodes[0].count,
    totalSkills: skills[0].count,
    activeSkills: activeSkills[0].count,
    learnedSkills: learnedSkills[0].count,
  }
}
