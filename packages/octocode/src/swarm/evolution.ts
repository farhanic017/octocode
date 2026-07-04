import { Effect, Context, Layer, Schema } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { FSUtil } from "@octocode-ai/core/fs-util"
import path from "path"

const DENIED_SKILL_TERMS = [
  "steal",
  "exfiltrate",
  "credential",
  "password",
  "malware",
  "bypass",
  "disable security",
  "delete user files",
] as const

export const SkillDraft = Schema.Struct({
  name: Schema.String,
  trigger: Schema.String,
  purpose: Schema.String,
  steps: Schema.Array(Schema.String),
  evidence: Schema.Array(Schema.String),
  version: Schema.Number,
  confidence: Schema.Number,
  tags: Schema.Array(Schema.String),
})
export type SkillDraft = Schema.Schema.Type<typeof SkillDraft>

export const ValidationResult = Schema.Struct({
  ok: Schema.Boolean,
  issues: Schema.Array(Schema.String),
  gates: Schema.Struct({
    hasName: Schema.Boolean,
    hasReusableSteps: Schema.Boolean,
    safeTerms: Schema.Boolean,
    boundedSize: Schema.Boolean,
  }),
})
export type ValidationResult = Schema.Schema.Type<typeof ValidationResult>

export interface Interface {
  readonly proposeSkill: (input: {
    task: string
    outcome: string
    lesson: string
    agentName?: string
  }) => Effect.Effect<{ draft: SkillDraft; validation: ValidationResult }>
  readonly validateSkill: (draft: SkillDraft) => Effect.Effect<ValidationResult>
  readonly persistSkill: (draft: SkillDraft) => Effect.Effect<{
    saved: boolean
    path: string
    version: number
    validation: ValidationResult
  }>
  readonly listEvolvedSkills: () => Effect.Effect<
    Array<{ name: string; version: number; path: string; purpose: string; tags: string[] }>
  >
  readonly buildEvolutionPlan: (task: string) => Effect.Effect<{
    task: string
    evolutionLoop: string[]
    guardrails: Record<string, boolean>
  }>
}

export class Service extends Context.Service<Service, Interface>()("@octocode/SwarmEvolution") {}

function validateSkillSync(draft: SkillDraft): ValidationResult {
  const text = `${draft.name} ${draft.purpose} ${draft.steps.join(" ")}`.toLowerCase()
  const issues: string[] = []

  if (!draft.name) issues.push("skill name is required")
  if (draft.purpose.length < 12) issues.push("purpose is too short")
  if (draft.steps.length < 3) issues.push("at least three reusable steps are required")
  if (DENIED_SKILL_TERMS.some((term) => text.includes(term))) {
    issues.push("unsafe or credential-related behavior is not allowed")
  }
  if (JSON.stringify(draft).length > 6000) {
    issues.push("skill manifest is too large")
  }

  return {
    ok: issues.length === 0,
    issues,
    gates: {
      hasName: Boolean(draft.name),
      hasReusableSteps: draft.steps.length >= 3,
      safeTerms: !DENIED_SKILL_TERMS.some((term) => text.includes(term)),
      boundedSize: JSON.stringify(draft).length <= 6000,
    },
  }
}

function inferSkillName(task: string, lesson: string): string {
  const source = lesson || task || "hermes evolved skill"
  const words = source
    .split(/\s+/)
    .map((w) => w.replace(/[.,:;!?\[\](){}]/g, "").toLowerCase())
    .filter((w) => w.length > 3 && !["always", "should", "with", "from", "into", "using"].includes(w))
  return (
    words
      .slice(0, 5)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "Hermes Evolved Skill"
  )
}

function inferSteps(text: string): string[] {
  const steps = ["Identify when the pattern applies", "Execute the proven workflow", "Validate the result before handoff"]
  if (/test|bug/.test(text)) steps.splice(2, 0, "Add regression tests for the discovered edge case")
  if (/design|visual/.test(text)) steps.splice(1, 0, "Capture visual constraints and acceptance criteria")
  if (/api|backend/.test(text)) steps.splice(1, 0, "Define inputs, outputs, permissions, and failure modes")
  return steps
}

function inferTags(text: string, agentName: string): string[] {
  const tags = new Set(["hermes", "self-evolved", agentName])
  for (const token of ["testing", "design", "backend", "frontend", "security", "browser", "animation", "vision"]) {
    if (text.includes(token)) tags.add(token)
  }
  return Array.from(tags).sort()
}

function confidenceScore(_task: string, outcome: string, lesson: string): number {
  let score = 62
  if (outcome) score += 10
  if (lesson) score += 12
  if (/passed|success|fixed|verified/.test(outcome.toLowerCase())) score += 10
  return Math.min(96, score)
}

function compactSentence(value: string, limit: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, limit)
}

function slug(value: string): string {
  let safe = value
    .toLowerCase()
    .split("")
    .map((ch) => (/[a-z0-9]/.test(ch) ? ch : "-"))
    .join("")
  while (safe.includes("--")) safe = safe.replace("--", "-")
  return safe.replace(/^-|-$/g, "") || "hermes-skill"
}

type DirentEntry = { name: string; isDirectory: () => boolean }

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fsys = yield* FSUtil.Service

    const proposeSkill = Effect.fn("SwarmEvolution.proposeSkill")(function* (input: {
      task: string
      outcome: string
      lesson: string
      agentName?: string
    }) {
      const name = inferSkillName(input.task, input.lesson)
      const steps = inferSteps(`${input.task} ${input.outcome} ${input.lesson}`.toLowerCase())
      const tags = inferTags(
        `${input.task} ${input.outcome} ${input.lesson}`.toLowerCase(),
        input.agentName ?? "hermes",
      )

      const draft: SkillDraft = {
        name,
        trigger: compactSentence(input.task, 140),
        purpose: compactSentence(input.lesson || input.outcome || input.task, 220),
        steps,
        evidence: [compactSentence(input.outcome, 180), compactSentence(input.lesson, 180)].filter(Boolean),
        version: 1,
        confidence: confidenceScore(input.task, input.outcome, input.lesson),
        tags,
      }

      return { draft, validation: validateSkillSync(draft) }
    })

    const validateSkill = Effect.fn("SwarmEvolution.validateSkill")((draft: SkillDraft) =>
      Effect.succeed(validateSkillSync(draft)),
    )

    const persistSkill = Effect.fn("SwarmEvolution.persistSkill")(function* (draft: SkillDraft) {
      const validation = validateSkillSync(draft)
      if (!validation.ok) {
        return { saved: false, path: "", version: 0, validation }
      }

      const dir = yield* InstanceState.directory
      const evolvedDir = path.join(dir, ".octocode", "evolved_skills")
      yield* fsys.ensureDir(evolvedDir).pipe(Effect.catch(() => Effect.succeed(undefined)))

      const safe = slug(draft.name)
      const target = path.join(evolvedDir, safe)
      yield* fsys.ensureDir(target).pipe(Effect.catch(() => Effect.succeed(undefined)))

      const version = 1
      const manifest = path.join(target, `v${version}.json`)
      const payload = {
        ...draft,
        version,
        savedAt: Date.now(),
        source: "hermes_self_evolution",
      }

      yield* Effect.tryPromise({
        try: () =>
          import("node:fs/promises").then((fs) => fs.writeFile(manifest, JSON.stringify(payload, null, 2), "utf-8")),
        catch: (err) => err,
      }).pipe(Effect.catch(() => Effect.succeed(undefined)))

      const markdown = [
        `# ${draft.name}`,
        "",
        `Version: ${version}`,
        "",
        `Purpose: ${draft.purpose}`,
        "",
        `Trigger: ${draft.trigger}`,
        "",
        `Tags: ${draft.tags.join(", ")}`,
        "",
        "## Workflow",
        "",
        ...draft.steps.map((step, i) => `${i + 1}. ${step}`),
      ].join("\n")

      yield* Effect.tryPromise({
        try: () =>
          import("node:fs/promises").then((fs) =>
            fs.writeFile(path.join(target, "SKILL.md"), markdown, "utf-8"),
          ),
        catch: (err) => err,
      }).pipe(Effect.catch(() => Effect.succeed(undefined)))

      return { saved: true, path: manifest, version, validation }
    })

    const listEvolvedSkills = Effect.fn("SwarmEvolution.listEvolvedSkills")(function* () {
      const dir = yield* InstanceState.directory
      const evolvedDir = path.join(dir, ".octocode", "evolved_skills")
      const exists = yield* fsys.existsSafe(evolvedDir).pipe(Effect.catch(() => Effect.succeed(false)))
      if (!exists) return [] as Array<{ name: string; version: number; path: string; purpose: string; tags: string[] }>

      const entries = yield* Effect.tryPromise({
        try: () =>
          import("node:fs/promises").then((fs) => fs.readdir(evolvedDir, { withFileTypes: true })),
        catch: () => [] as DirentEntry[],
      }).pipe(Effect.catch(() => Effect.succeed([] as DirentEntry[])))

      const results: Array<{ name: string; version: number; path: string; purpose: string; tags: string[] }> = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const manifestPath = path.join(evolvedDir, entry.name, "v1.json")
        const manifestExists = yield* fsys.existsSafe(manifestPath).pipe(Effect.catch(() => Effect.succeed(false)))
        if (!manifestExists) continue

        const data = yield* Effect.tryPromise({
          try: () => import("node:fs/promises").then((fs) => fs.readFile(manifestPath, "utf-8")),
          catch: () => null as string | null,
        }).pipe(Effect.catch(() => Effect.succeed(null as string | null)))

        if (!data) continue
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>
          results.push({
            name: (parsed.name as string) ?? entry.name,
            version: (parsed.version as number) ?? 1,
            path: manifestPath,
            purpose: (parsed.purpose as string) ?? "",
            tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [],
          })
        } catch {
          // skip malformed files
        }
      }
      return results
    })

    const buildEvolutionPlan = Effect.fn("SwarmEvolution.buildEvolutionPlan")((task: string) =>
      Effect.succeed({
        task,
        evolutionLoop: [
          "Observe successful work, failures, and repeated workflows",
          "Compress the reusable pattern into a candidate skill",
          "Validate safety, scope, and reuse gates",
          "Save a versioned manifest and SKILL.md only after validation",
          "Reuse the skill in future prompts when tags match the new task",
        ],
        guardrails: {
          noUnreviewedCodeExecution: true,
          noSecretOrCredentialSkills: true,
          versionEverySkill: true,
          keepSkillsSmallAndTaskScoped: true,
          masterReviewBeforeReleaseUse: true,
        },
      }),
    )

    return Service.of({ proposeSkill, validateSkill, persistSkill, listEvolvedSkills, buildEvolutionPlan })
  }),
)

export * as SwarmEvolution from "./evolution"
