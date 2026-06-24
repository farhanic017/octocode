import { Context, Effect, Layer } from "effect"

import { InstanceState } from "@/effect/instance-state"

import PROMPT_ANTHROPIC from "./prompt/anthropic.txt"
import PROMPT_DEFAULT from "./prompt/default.txt"
import PROMPT_BEAST from "./prompt/beast.txt"
import PROMPT_GEMINI from "./prompt/gemini.txt"
import PROMPT_GPT from "./prompt/gpt.txt"
import PROMPT_KIMI from "./prompt/kimi.txt"

import PROMPT_CODEX from "./prompt/codex.txt"
import PROMPT_TRINITY from "./prompt/trinity.txt"
import type { Provider } from "@/provider/provider"
import type { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import { Skill } from "@/skill"
import { readStylePreferences, injectMemoryContext } from "./memory"

export function provider(model: Provider.Model) {
  if (model.api.id.includes("gpt-4") || model.api.id.includes("o1") || model.api.id.includes("o3"))
    return [PROMPT_BEAST]
  if (model.api.id.includes("gpt")) {
    if (model.api.id.includes("codex")) {
      return [PROMPT_CODEX]
    }
    return [PROMPT_GPT]
  }
  if (model.api.id.includes("gemini-")) return [PROMPT_GEMINI]
  if (model.api.id.includes("claude")) return [PROMPT_ANTHROPIC]
  if (model.api.id.toLowerCase().includes("trinity")) return [PROMPT_TRINITY]
  if (model.api.id.toLowerCase().includes("kimi")) return [PROMPT_KIMI]
  return [PROMPT_DEFAULT]
}

export interface Interface {
  readonly environment: (model: Provider.Model) => Effect.Effect<string[]>
  readonly skills: (agent: Agent.Info) => Effect.Effect<string | undefined>
  readonly styleContext: () => Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@octocode/SystemPrompt") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const skill = yield* Skill.Service

    return Service.of({
      environment: Effect.fn("SystemPrompt.environment")(function* (model: Provider.Model) {
        const ctx = yield* InstanceState.context
        const projectID = ctx.project.id ?? "default"
        const stylePrefs = yield* Effect.promise(() => readStylePreferences(projectID))
        const memoryCtx = yield* Effect.promise(() => injectMemoryContext(projectID))

        const envLines = [
          [
            `You are powered by the model named ${model.api.id}. The exact model ID is ${model.providerID}/${model.api.id}`,
            `Here is some useful information about the environment you are running in:`,
            `<env>`,
            `  Working directory: ${ctx.directory}`,
            `  Workspace root folder: ${ctx.worktree}`,
            `  Is directory a git repo: ${ctx.project.vcs === "git" ? "yes" : "no"}`,
            `  Platform: ${process.platform}`,
            `  Today's date: ${new Date().toDateString()}`,
            `</env>`,
          ].join("\n"),
        ]

        // Add style preferences context
        if (Object.keys(stylePrefs).length > 0) {
          const styleLines = ["<user_style>"]
          if (stylePrefs.tone) styleLines.push(`  Tone: ${stylePrefs.tone}`)
          if (stylePrefs.verbosity) styleLines.push(`  Verbosity: ${stylePrefs.verbosity}`)
          if (stylePrefs.codeStyle) styleLines.push(`  Code style: ${stylePrefs.codeStyle}`)
          if (stylePrefs.responseFormat) styleLines.push(`  Response format: ${stylePrefs.responseFormat}`)
          if (stylePrefs.favoriteLanguages?.length) styleLines.push(`  Languages: ${stylePrefs.favoriteLanguages.join(", ")}`)
          if (stylePrefs.customInstructions?.length) {
            styleLines.push("  Custom instructions:")
            stylePrefs.customInstructions.forEach((inst) => styleLines.push(`    - ${inst}`))
          }
          styleLines.push("</user_style>")
          envLines.push(styleLines.join("\n"))
        }

        // Add memory context
        if (memoryCtx) {
          envLines.push(`<memory>\n${memoryCtx}\n</memory>`)
        }

        return envLines
      }),

      skills: Effect.fn("SystemPrompt.skills")(function* (agent: Agent.Info) {
        if (Permission.disabled(["skill"], agent.permission).has("skill")) return

        const list = yield* skill.available(agent)

        return [
          "Skills provide specialized instructions and workflows for specific tasks.",
          "Use the skill tool to load a skill when a task matches its description.",
          Skill.fmt(list, { verbose: true }),
        ].join("\n")
      }),

      styleContext: Effect.fn("SystemPrompt.styleContext")(function* () {
        const ctx = yield* InstanceState.context
        const projectID = ctx.project.id ?? "default"
        const prefs = yield* Effect.promise(() => readStylePreferences(projectID))
        if (Object.keys(prefs).length === 0) return ""
        
        const lines = ["# User Style Preferences"]
        if (prefs.tone) lines.push(`- Tone: ${prefs.tone}`)
        if (prefs.verbosity) lines.push(`- Verbosity: ${prefs.verbosity}`)
        if (prefs.codeStyle) lines.push(`- Code style: ${prefs.codeStyle}`)
        if (prefs.responseFormat) lines.push(`- Response format: ${prefs.responseFormat}`)
        if (prefs.favoriteLanguages?.length) lines.push(`- Languages: ${prefs.favoriteLanguages.join(", ")}`)
        if (prefs.customInstructions?.length) {
          lines.push("- Custom instructions:")
          prefs.customInstructions.forEach((inst) => lines.push(`  - ${inst}`))
        }
        return lines.join("\n")
      }),
    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(Skill.defaultLayer))

export * as SystemPrompt from "./system"
