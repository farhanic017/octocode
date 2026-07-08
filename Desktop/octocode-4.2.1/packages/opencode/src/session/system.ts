import { Context, Effect, Layer } from "effect"
import path from "path"

import { Instance } from "../project/instance"
import { Global } from "../global"
import * as Filesystem from "../util/filesystem"

import PROMPT_ANTHROPIC from "./prompt/anthropic.txt"
import PROMPT_DEFAULT from "./prompt/default.txt"
import PROMPT_BEAST from "./prompt/beast.txt"
import PROMPT_GEMINI from "./prompt/gemini.txt"
import PROMPT_GPT from "./prompt/gpt.txt"
import PROMPT_KIMI from "./prompt/kimi.txt"

import PROMPT_CODEX from "./prompt/codex.txt"
import PROMPT_DEEPSEEK from "./prompt/deepseek.txt"
import PROMPT_GLM from "./prompt/glm.txt"
import PROMPT_MINIMAX from "./prompt/minimax.txt"
import PROMPT_TRINITY from "./prompt/trinity.txt"
import type { Provider } from "@/provider"
import type { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import { Skill } from "@/skill"

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
  if (model.api.id.toLowerCase().includes("deepseek")) return [PROMPT_DEEPSEEK]
  if (model.api.id.toLowerCase().includes("glm")) return [PROMPT_GLM]
  if (model.api.id.toLowerCase().includes("minimax")) return [PROMPT_MINIMAX]
  return [PROMPT_DEFAULT]
}

async function readBrainVault(): Promise<{ vaultPath: string; files: string[] } | null> {
  try {
    const kvPath = path.join(Global.Path.state, "kv.json")
    const kv = await Filesystem.readJson<Record<string, any>>(kvPath).catch(() => ({} as Record<string, any>))
    const vaultPath = kv.brain_vault_path as string
    if (!vaultPath) return null

    const exists = await Filesystem.exists(vaultPath)
    if (!exists) return null

    const entries = await import("fs/promises").then((fs) => fs.readdir(vaultPath))
    const mdFiles = entries.filter((f: string) => f.endsWith(".md")).sort()

    return { vaultPath, files: mdFiles }
  } catch {
    return null
  }
}

async function readKnowledgeGraph(workspacePath: string): Promise<{ name: string; description: string; components: string[] } | null> {
  try {
    const graphPath = path.join(workspacePath, ".understand-anything", "knowledge-graph.json")
    const exists = await Filesystem.exists(graphPath)
    if (!exists) return null

    const content = await Filesystem.readText(graphPath)
    const graph = JSON.parse(content)

    const components = (graph.nodes || []).slice(0, 8).map((n: any) => `${n.name} (${n.type})`)

    return {
      name: graph.project?.name || "Unknown",
      description: graph.project?.description || "",
      components,
    }
  } catch {
    return null
  }
}

export interface Interface {
  readonly environment: (model: Provider.Model, now: number) => Promise<string[]>
  readonly skills: (agent: Agent.Info, query?: string) => Effect.Effect<string | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SystemPrompt") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const skill = yield* Skill.Service

    return Service.of({
      async environment(model, now) {
        const project = Instance.project
        const brain = await readBrainVault()
        const knowledgeGraph = await readKnowledgeGraph(Instance.worktree)

        const envBlock = [
          `You are OctoCode Agent, built by Farhan Dhrubo. You are an interactive agent that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.`,
          `You are powered by the model named ${model.api.id}. The exact model ID is ${model.providerID}/${model.api.id}`,
          `Here is some useful information about the environment you are running in:`,
          `<env>`,
          `  Working directory: ${Instance.directory}`,
          `  Workspace root folder: ${Instance.worktree}`,
          `  Is directory a git repo: ${project.vcs === "git" ? "yes" : "no"}`,
          `  Platform: ${process.platform}`,
          `  Today's date: ${new Date(now).toDateString()}`,
          `</env>`,
        ]

        const parts = [envBlock.join("\n"), `IMPORTANT: Your response must ALWAYS strictly follow the same major language as the user.`]

        // Only inject brain vault reference if it exists (just paths, read content when needed)
        if (brain) {
          parts.push(
            [
              `<brain>`,
              `Vault: ${brain.vaultPath}`,
              `Files: ${brain.files.join(", ")}`,
              `Read files from vault when user mentions memory, vault, brain, or notes.`,
              `</brain>`,
            ].join("\n"),
          )
        }

        // Only inject knowledge graph reference if it exists (just names, read when needed)
        if (knowledgeGraph) {
          parts.push(
            [
              `<knowledge>`,
              `Project: ${knowledgeGraph.name}`,
              knowledgeGraph.description ? `Description: ${knowledgeGraph.description}` : "",
              `Components: ${knowledgeGraph.components.join(", ")}`,
              `Read .understand-anything/knowledge-graph.json for details when user mentions architecture, components, or project structure.`,
              `</knowledge>`,
            ].filter(Boolean).join("\n"),
          )
        }

        return parts
      },

      skills: Effect.fn("SystemPrompt.skills")(function* (agent: Agent.Info, query?: string) {
        if (Permission.disabled(["skill"], agent.permission).has("skill")) return

        const list = yield* skill.available(agent)
        const active = yield* skill.activeSkills()

        return [
          "Skills provide specialized instructions and workflows for specific tasks.",
          "Use the skill tool to load a skill when a task matches its description.",
          // the agents seem to ingest the information about skills a bit better if we present a more verbose
          // version of them here and a less verbose version in tool description, rather than vice versa.
          Skill.fmt(list, { verbose: true, query, active }),
        ].join("\n")
      }),
    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(Skill.defaultLayer))

export * as SystemPrompt from "./system"
