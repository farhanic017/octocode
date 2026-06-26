import { PermissionV1 } from "@octocode-ai/core/v1/permission"
import path from "path"
import { SessionV1 } from "@octocode-ai/core/v1/session"
import os from "os"
import { SessionID, MessageID, PartID } from "./schema"
import { MessageV2 } from "./message-v2"
import { Log } from "@octocode-ai/core/util/log"
import { SessionRevert } from "./revert"
import { Session } from "./session"
import { Agent } from "../agent/agent"
import { Provider } from "@/provider/provider"

import { type Tool as AITool, tool, jsonSchema } from "ai"
import type { JSONSchema7 } from "@ai-sdk/provider"
import { SessionCompaction } from "./compaction"
import { SystemPrompt } from "./system"
import { Instruction } from "./instruction"
import { Plugin } from "../plugin"
import MAX_STEPS from "../session/prompt/max-steps.txt"
import { ToolRegistry } from "@/tool/registry"
import { MCP } from "../mcp"
import { LSP } from "@/lsp/lsp"
import { ulid } from "ulid"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { CrossSpawnSpawner } from "@octocode-ai/core/cross-spawn-spawner"
import * as Stream from "effect/Stream"
import { Command } from "../command"
import { pathToFileURL, fileURLToPath } from "url"
import { Config } from "@/config/config"
import { ConfigMarkdown } from "@/config/markdown"
import { SessionSummary } from "./summary"
import { NamedError } from "@octocode-ai/core/util/error"
import { SessionProcessor } from "./processor"
import { Tool } from "@/tool/tool"
import { Permission } from "@/permission"
import { SessionStatus } from "./status"
import { LLM } from "./llm"
import { Shell } from "@/shell/shell"
import { ShellID } from "@/tool/shell/id"
import { FSUtil } from "@octocode-ai/core/fs-util"
import { Truncate } from "@/tool/truncate"
import { Image } from "@/image/image"
import { decodeDataUrl } from "@/util/data-url"
import { Process } from "@/util/process"
import { Cause, Effect, Exit, Latch, Layer, Option, Scope, Context, Schema, Types } from "effect"
import * as EffectLogger from "@octocode-ai/core/effect/logger"
import { InstanceState } from "@/effect/instance-state"
import { TaskTool, type TaskPromptOps } from "@/tool/task"
import { SessionRunState } from "./run-state"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { EventV2Bridge } from "@/event-v2-bridge"
import { Database } from "@octocode-ai/core/database/database"
import { SessionEvent } from "@octocode-ai/core/session/event"
import { SessionMessage } from "@octocode-ai/core/session/message"
import { ModelV2 } from "@octocode-ai/core/model"
import { ProviderV2 } from "@octocode-ai/core/provider"
import { AgentAttachment, FileAttachment, Prompt, ReferenceAttachment, Source } from "@octocode-ai/core/session/prompt"
import { Reference } from "@/reference/reference"
import * as DateTime from "effect/DateTime"
import { eq } from "drizzle-orm"
import { SessionTable } from "@octocode-ai/core/session/sql"
import { referencePromptMetadata, referenceTextPart } from "./prompt/reference"
import { SessionReminders } from "./reminders"
import { SessionTools } from "./tools"
import { LLMEvent } from "@octocode-ai/llm"
import { SwarmVision } from "@/swarm/vision"
import { SwarmLearning } from "@/swarm/learning"

// @ts-ignore
globalThis.AI_SDK_LOG_WARNINGS = false

const decodeMessageInfo = Schema.decodeUnknownExit(SessionV1.Info)
const decodeMessagePart = Schema.decodeUnknownExit(SessionV1.Part)

const STRUCTURED_OUTPUT_DESCRIPTION = `Use this tool to return your final response in the requested structured format.

IMPORTANT:
- You MUST call this tool exactly once at the end of your response
- The input must be valid JSON matching the required schema
- Complete all necessary research and tool calls BEFORE calling this tool
- This tool provides your final answer - no further actions are taken after calling it`

const STRUCTURED_OUTPUT_SYSTEM_PROMPT = `IMPORTANT: The user has requested structured output. You MUST use the StructuredOutput tool to provide your final response. Do NOT respond with plain text - you MUST call the StructuredOutput tool with your answer formatted according to the schema.`

const log = Log.create({ service: "session.prompt" })
const elog = EffectLogger.create({ service: "session.prompt" })
const AGENT_SWARM_AGENT = "agent-swarm"
const AGENT_SWARM_DEFAULT_DIR = path.join(os.homedir(), "Desktop", "agent-swarm-main")
const AGENT_SWARM_OUTPUT_LIMIT = 60_000

const GREETINGS = /^(hi|hey|hello|sup|yo|hola|namaste|salaam|greetings|howdy|what'?s up|how are you|how's it going|hey there|hi there|thanks|thank you|ok|okay|got it|understood|sure|cool|nice|great|perfect|awesome|bye|goodbye|see you|later)\b/i
const FILLER_WORDS = /^(i|me|my|mine|we|our|you|your|it|its|this|that|the|a|an|and|or|but|so|if|then|than|can|could|would|should|will|shall|may|might|do|does|did|have|has|had|be|am|is|are|was|were|being|been|to|of|in|on|at|by|for|with|from|up|about|into|through|during|before|after|above|below|between|out|off|over|under|again|further|once|here|there|when|where|why|how|all|each|every|both|few|more|most|other|some|such|no|not|only|own|same|than|too|very|just|also|now|please|help|want|need|make|fix|add|remove|change|update|create|write|read|check|look|find|get|set|put|give|take|let|try|use|run|start|stop|open|close|show|hide|delete|install|build|test|debug|deploy|push|pull|merge|commit|clone|init)$/i

// Fast-path: "make it 20", "set to 10", "change to 50" — treat as literal number assignment
const NUMBER_ASSIGN = /^(make|set|change|update|put|use|try)\s+(it|this|that|the\s+\w+)?\s*(to|=)?\s*(\d+)$/i
// Fast-path: "add 10", "subtract 5", "multiply by 3", "divide by 2" — do the math
const MATH_OP = /^(add|plus|\+|subtract|minus|\-|multiply|times|\*|divide|divided\s+by|\/)\s+(\d+)$/i
// Detect session references: "that session", "the previous one"
const SESSION_REF = /(that|the|this|previous|last|earlier|recent)\s+(session|chat|conversation|one)/i

function extractTopic(text: string, dateStr: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim()

  if (GREETINGS.test(cleaned) && cleaned.split(" ").length <= 3) {
    return `Greeting - ${dateStr}`
  }

  const words = cleaned.split(" ")
  const meaningful: string[] = []

  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (lower.length < 2) continue
    if (FILLER_WORDS.test(lower)) continue
    meaningful.push(word.replace(/[^a-zA-Z0-9-_./@#]/g, ""))
    if (meaningful.length >= 4) break
  }

  if (meaningful.length === 0) {
    return `Chat - ${dateStr}`
  }

  const topic = meaningful.join(" ")
  const capitalized = topic.charAt(0).toUpperCase() + topic.slice(1)

  if (capitalized.length > 40) {
    return `${capitalized.substring(0, 37)}... - ${dateStr}`
  }
  return `${capitalized} - ${dateStr}`
}

function agentSwarmPromptText(message: SessionV1.WithParts) {
  return message.parts
    .filter((part): part is SessionV1.TextPart => part.type === "text" && !part.synthetic && !part.ignored)
    .map((part) => part.text)
    .join("\n\n")
    .trim()
}

function truncateAgentSwarmOutput(output: string) {
  if (output.length <= AGENT_SWARM_OUTPUT_LIMIT) return output
  const omitted = output.length - AGENT_SWARM_OUTPUT_LIMIT
  return `${output.slice(-AGENT_SWARM_OUTPUT_LIMIT)}\n\n[Agent Swarm output truncated: omitted ${omitted} earlier characters]`
}

function isOrphanedInterruptedTool(part: SessionV1.ToolPart) {
  // cleanup() marks abandoned tool_use blocks this way after retries/aborts.
  // They are not pending work and must not trigger an assistant-prefill request.
  return part.state.status === "error" && part.state.metadata?.interrupted === true
}

export interface Interface {
  readonly cancel: (sessionID: SessionID) => Effect.Effect<void>
  readonly prompt: (input: PromptInput) => Effect.Effect<SessionV1.WithParts, Image.Error>
  readonly loop: (input: LoopInput) => Effect.Effect<SessionV1.WithParts>
  readonly shell: (input: ShellInput) => Effect.Effect<SessionV1.WithParts, Session.BusyError>
  readonly command: (input: CommandInput) => Effect.Effect<SessionV1.WithParts, Image.Error>
  readonly resolvePromptParts: (template: string) => Effect.Effect<PromptInput["parts"]>
}

export class Service extends Context.Service<Service, Interface>()("@octocode/SessionPrompt") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const status = yield* SessionStatus.Service
    const sessions = yield* Session.Service
    const agents = yield* Agent.Service
    const provider = yield* Provider.Service
    const processor = yield* SessionProcessor.Service
    const compaction = yield* SessionCompaction.Service
    const plugin = yield* Plugin.Service
    const commands = yield* Command.Service
    const config = yield* Config.Service
    const permission = yield* Permission.Service
    const fsys = yield* FSUtil.Service
    const mcp = yield* MCP.Service
    const lsp = yield* LSP.Service
    const registry = yield* ToolRegistry.Service
    const truncate = yield* Truncate.Service
    const image = yield* Image.Service
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const scope = yield* Scope.Scope
    const instruction = yield* Instruction.Service
    const state = yield* SessionRunState.Service
    const revert = yield* SessionRevert.Service
    const summary = yield* SessionSummary.Service
    const sys = yield* SystemPrompt.Service
    const llm = yield* LLM.Service
    const references = yield* Reference.Service
    const events = yield* EventV2Bridge.Service
    const flags = yield* RuntimeFlags.Service
    const database = yield* Database.Service
    const { db } = database
    const ops = Effect.fn("SessionPrompt.ops")(function* () {
      return {
        cancel: (sessionID: SessionID) => cancel(sessionID),
        resolvePromptParts: (template: string) => resolvePromptParts(template),
        prompt: (input: PromptInput) => prompt(input).pipe(Effect.catch(Effect.die)),
      } satisfies TaskPromptOps
    })

    const cancel = Effect.fn("SessionPrompt.cancel")(function* (sessionID: SessionID) {
      yield* elog.info("cancel", { sessionID })
      yield* state.cancel(sessionID)
    })

    const resolveReferenceParts = Effect.fnUntraced(function* (template: string) {
      const parts: Types.DeepMutable<PromptInput["parts"]> = []
      const seen = new Set<string>()
      yield* Effect.forEach(
        ConfigMarkdown.files(template),
        Effect.fnUntraced(function* (match) {
          const name = match[1]
          if (!name) return
          const alias = name.split("/")[0]
          if (!alias || seen.has(alias)) return
          const reference = yield* references.get(alias)
          if (!reference) return
          seen.add(alias)

          const start = match.index ?? 0
          const source = { value: match[0], start, end: start + match[0].length }
          if (reference.kind === "invalid") {
            parts.push(referenceTextPart({ reference, source }))
            return
          }

          yield* references.ensure(reference.path)
          parts.push({
            type: "file",
            url: pathToFileURL(reference.path).href,
            filename: alias,
            mime: "application/x-directory",
            source: { type: "file", text: source, path: alias },
          })
        }),
        { concurrency: 1, discard: true },
      )
      return parts
    })

    const resolvePromptParts = Effect.fn("SessionPrompt.resolvePromptParts")(function* (template: string) {
      const ctx = yield* InstanceState.context
      const parts: Types.DeepMutable<PromptInput["parts"]> = [
        { type: "text", text: template },
        ...(yield* resolveReferenceParts(template)),
      ]
      const files = ConfigMarkdown.files(template)
      const seen = new Set<string>()
      yield* Effect.forEach(
        files,
        Effect.fnUntraced(function* (match) {
          const name = match[1]
          if (!name) return
          if (seen.has(name)) return
          seen.add(name)

          const slash = name.indexOf("/")
          const alias = slash === -1 ? name : name.slice(0, slash)
          if (yield* references.get(alias)) return

          const filepath = name.startsWith("~/")
            ? path.join(os.homedir(), name.slice(2))
            : path.resolve(ctx.worktree, name)

          const info = yield* fsys.stat(filepath).pipe(Effect.option)
          if (Option.isNone(info)) {
            const found = yield* agents.get(name)
            if (found) parts.push({ type: "agent", name: found.name })
            return
          }
          const stat = info.value
          parts.push({
            type: "file",
            url: pathToFileURL(filepath).href,
            filename: name,
            mime: stat.type === "Directory" ? "application/x-directory" : "text/plain",
          })
        }),
        { concurrency: "unbounded", discard: true },
      )
      return parts
    })

    const title = Effect.fn("SessionPrompt.ensureTitle")(function* (input: {
      session: Session.Info
      history: SessionV1.WithParts[]
      providerID: ProviderV2.ID
      modelID: ModelV2.ID
      force?: boolean
    }) {
      if (input.session.parentID) return

      const real = (m: SessionV1.WithParts) =>
        m.info.role === "user" && !m.parts.every((p) => "synthetic" in p && p.synthetic)
      const realMessages = input.history.filter(real)
      if (realMessages.length === 0) return

      const isDefault = Session.isDefaultTitle(input.session.title)
      const isAutoGenerated = input.session.title.length <= 30 && !input.session.title.includes(" - ")
      const shouldUpdate = isDefault || isAutoGenerated || input.force === true
      if (!shouldUpdate) return

      const lastUser = realMessages[realMessages.length - 1]
      if (!lastUser || lastUser.info.role !== "user") return

      const context = input.history.slice(0, input.history.indexOf(lastUser) + 1)

      const subtasks = lastUser.parts.filter((p): p is SessionV1.SubtaskPart => p.type === "subtask")
      const onlySubtasks = subtasks.length > 0 && lastUser.parts.every((p) => p.type === "subtask")

      const ag = yield* agents.get("title")
      if (!ag) return
      const mdl = ag.model
        ? yield* provider.getModel(ag.model.providerID, ag.model.modelID)
        : ((yield* provider.getSmallModel(input.providerID)) ??
          (yield* provider.getModel(input.providerID, input.modelID)))
      const msgs = onlySubtasks
        ? [{ role: "user" as const, content: subtasks.map((p) => p.prompt).join("\n") }]
        : yield* MessageV2.toModelMessagesEffect(context, mdl)

      const today = new Date()
      const dateStr = `${today.toLocaleString("en-US", { month: "short" })} ${today.getDate()}`
      const titlePrompt = isDefault || isAutoGenerated
        ? `Today is ${dateStr}. Generate a title for this conversation:\n`
        : `Today is ${dateStr}. Update the title to reflect the CURRENT topic. Return ONLY the new title:\n`

      const text = yield* llm
        .stream({
          agent: ag,
          user: lastUser.info,
          system: [],
          small: true,
          tools: {},
          model: mdl,
          sessionID: input.session.id,
          retries: 2,
          messages: [{ role: "user", content: titlePrompt }, ...msgs],
        })
        .pipe(
          Stream.filter(LLMEvent.is.textDelta),
          Stream.map((e) => e.text),
          Stream.mkString,
          Effect.orDie,
        )
      const cleaned = text
        .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0)
      if (!cleaned) return
      const t = cleaned.length > 100 ? cleaned.substring(0, 97) + "..." : cleaned
      yield* sessions
        .setTitle({ sessionID: input.session.id, title: t })
        .pipe(Effect.catchCause((cause) => elog.error("failed to generate title", { error: Cause.squash(cause) })))
    })

    const generateLocalTitle = Effect.fnUntraced(function* (sessionID: SessionID, history: SessionV1.WithParts[]) {
      const real = (m: SessionV1.WithParts) =>
        m.info.role === "user" && !m.parts.every((p) => "synthetic" in p && p.synthetic)
      const realMessages = history.filter(real)
      if (realMessages.length === 0) return

      const lastUser = realMessages[realMessages.length - 1]
      if (!lastUser) return

      const userText = lastUser.parts
        .filter((p): p is SessionV1.TextPart => p.type === "text" && !p.synthetic)
        .map((p) => p.text)
        .join(" ")
        .trim()

      if (!userText) return

      const today = new Date()
      const dateStr = `${today.toLocaleString("en-US", { month: "short" })} ${today.getDate()}`
      const title = extractTopic(userText, dateStr)

      yield* sessions
        .setTitle({ sessionID, title })
        .pipe(Effect.catchCause((cause) => elog.error("failed to set local title", { error: Cause.squash(cause) })))
    })

    const handleSubtask = Effect.fn("SessionPrompt.handleSubtask")(function* (input: {
      task: SessionV1.SubtaskPart
      model: Provider.Model
      lastUser: SessionV1.User
      sessionID: SessionID
      session: Session.Info
      msgs: SessionV1.WithParts[]
    }) {
      const { task, model, lastUser, sessionID, session, msgs } = input
      const ctx = yield* InstanceState.context
      const promptOps = yield* ops()
      const { task: taskTool } = yield* registry.named()
      const taskModel = task.model ? yield* getModel(task.model.providerID, task.model.modelID, sessionID) : model
      const assistantMessage: SessionV1.Assistant = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        role: "assistant",
        parentID: lastUser.id,
        sessionID,
        mode: task.agent,
        agent: task.agent,
        variant: lastUser.model.variant,
        path: { cwd: ctx.directory, root: ctx.worktree },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        modelID: taskModel.id,
        providerID: taskModel.providerID,
        time: { created: Date.now() },
      })
      let part: SessionV1.ToolPart = yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID: assistantMessage.id,
        sessionID: assistantMessage.sessionID,
        type: "tool",
        callID: ulid(),
        tool: TaskTool.id,
        state: {
          status: "running",
          input: {
            prompt: task.prompt,
            description: task.description,
            subagent_type: task.agent,
            command: task.command,
          },
          time: { start: Date.now() },
        },
      })
      const taskArgs = {
        prompt: task.prompt,
        description: task.description,
        subagent_type: task.agent,
        command: task.command,
      }
      yield* plugin.trigger(
        "tool.execute.before",
        { tool: TaskTool.id, sessionID, callID: part.id },
        { args: taskArgs },
      )

      const taskAgent = yield* agents.get(task.agent)
      if (!taskAgent) {
        const available = (yield* agents.list()).filter((a) => !a.hidden).map((a) => a.name)
        const hint = available.length ? ` Available agents: ${available.join(", ")}` : ""
        const error = new NamedError.Unknown({ message: `Agent not found: "${task.agent}".${hint}` })
        yield* events.publish(Session.Event.Error, { sessionID, error: error.toObject() })
        throw error
      }

      let error: Error | undefined
      const taskAbort = new AbortController()
      const result = yield* taskTool
        .execute(taskArgs, {
          agent: task.agent,
          messageID: assistantMessage.id,
          sessionID,
          abort: taskAbort.signal,
          callID: part.callID,
          extra: { bypassAgentCheck: true, promptOps },
          messages: msgs,
          metadata: (val: { title?: string; metadata?: Record<string, any> }) =>
            Effect.gen(function* () {
              part = yield* sessions.updatePart({
                ...part,
                type: "tool",
                state: { ...part.state, ...val },
              } satisfies SessionV1.ToolPart)
            }),
          ask: (req: any) =>
            permission
              .ask({
                ...req,
                sessionID,
                ruleset: Permission.merge(taskAgent.permission, session.permission ?? []),
              })
              .pipe(Effect.orDie),
        })
        .pipe(
          Effect.catchCause((cause) => {
            const defect = Cause.squash(cause)
            error = defect instanceof Error ? defect : new Error(String(defect))
            log.error("subtask execution failed", { error, agent: task.agent, description: task.description })
            return Effect.void
          }),
          Effect.onInterrupt(() =>
            Effect.gen(function* () {
              taskAbort.abort()
              assistantMessage.finish = "tool-calls"
              assistantMessage.time.completed = Date.now()
              yield* sessions.updateMessage(assistantMessage)
              if (part.state.status === "running") {
                yield* sessions.updatePart({
                  ...part,
                  state: {
                    status: "error",
                    error: "Cancelled",
                    time: { start: part.state.time.start, end: Date.now() },
                    metadata: part.state.metadata,
                    input: part.state.input,
                  },
                } satisfies SessionV1.ToolPart)
              }
            }),
          ),
        )

      const attachments = result?.attachments?.map((attachment) => ({
        ...attachment,
        id: PartID.ascending(),
        sessionID,
        messageID: assistantMessage.id,
      }))

      yield* plugin.trigger(
        "tool.execute.after",
        { tool: TaskTool.id, sessionID, callID: part.id, args: taskArgs },
        result,
      )

      assistantMessage.finish = "tool-calls"
      assistantMessage.time.completed = Date.now()
      yield* sessions.updateMessage(assistantMessage)

      if (result && part.state.status === "running") {
        yield* sessions.updatePart({
          ...part,
          state: {
            status: "completed",
            input: part.state.input,
            title: result.title,
            metadata: result.metadata,
            output: result.output,
            attachments,
            time: { ...part.state.time, end: Date.now() },
          },
        } satisfies SessionV1.ToolPart)
      }

      if (!result) {
        yield* sessions.updatePart({
          ...part,
          state: {
            status: "error",
            error: error ? `Tool execution failed: ${error.message}` : "Tool execution failed",
            time: {
              start: part.state.status === "running" ? part.state.time.start : Date.now(),
              end: Date.now(),
            },
            metadata: part.state.status === "pending" ? undefined : part.state.metadata,
            input: part.state.input,
          },
        } satisfies SessionV1.ToolPart)
      }

      if (!task.command) return

      const summaryUserMsg: SessionV1.User = {
        id: MessageID.ascending(),
        sessionID,
        role: "user",
        time: { created: Date.now() },
        agent: lastUser.agent,
        model: lastUser.model,
      }
      yield* sessions.updateMessage(summaryUserMsg)
      yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID: summaryUserMsg.id,
        sessionID,
        type: "text",
        text: "Summarize the task tool output above and continue with your task.",
        synthetic: true,
      } satisfies SessionV1.TextPart)
    })

    const shellImpl = Effect.fn("SessionPrompt.shellImpl")(function* (input: ShellInput, ready?: Latch.Latch) {
      return yield* Effect.uninterruptibleMask((restore) =>
        Effect.gen(function* () {
          const markReady = ready ? ready.open.pipe(Effect.asVoid) : Effect.void
          const { msg, part, cwd } = yield* Effect.gen(function* () {
            const ctx = yield* InstanceState.context
            const session = yield* sessions.get(input.sessionID).pipe(Effect.orDie)
            if (session.revert) {
              yield* revert.cleanup(session)
            }
            const agent = yield* agents.get(input.agent)
            if (!agent) {
              const available = (yield* agents.list()).filter((a) => !a.hidden).map((a) => a.name)
              const hint = available.length ? ` Available agents: ${available.join(", ")}` : ""
              const error = new NamedError.Unknown({ message: `Agent not found: "${input.agent}".${hint}` })
              yield* events.publish(Session.Event.Error, { sessionID: input.sessionID, error: error.toObject() })
              throw error
            }
            const model = input.model ?? agent.model ?? (yield* currentModel(input.sessionID))
            const userMsg: SessionV1.User = {
              id: input.messageID ?? MessageID.ascending(),
              sessionID: input.sessionID,
              time: { created: Date.now() },
              role: "user",
              agent: input.agent,
              model: { providerID: model.providerID, modelID: model.modelID },
            }
            yield* sessions.updateMessage(userMsg)
            const userPart: SessionV1.Part = {
              type: "text",
              id: PartID.ascending(),
              messageID: userMsg.id,
              sessionID: input.sessionID,
              text: "The following tool was executed by the user",
              synthetic: true,
            }
            yield* sessions.updatePart(userPart)

            const msg: SessionV1.Assistant = {
              id: MessageID.ascending(),
              sessionID: input.sessionID,
              parentID: userMsg.id,
              mode: input.agent,
              agent: input.agent,
              cost: 0,
              path: { cwd: ctx.directory, root: ctx.worktree },
              time: { created: Date.now() },
              role: "assistant",
              tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
              modelID: model.modelID,
              providerID: model.providerID,
            }
            yield* sessions.updateMessage(msg)
            const started = Date.now()
            const part: SessionV1.ToolPart = {
              type: "tool",
              id: PartID.ascending(),
              messageID: msg.id,
              sessionID: input.sessionID,
              tool: ShellID.ToolID,
              callID: ulid(),
              state: {
                status: "running",
                time: { start: started },
                input: { command: input.command },
              },
            }
            yield* sessions.updatePart(part)
            if (flags.experimentalEventSystem) {
              yield* events.publish(SessionEvent.Shell.Started, {
                sessionID: input.sessionID,
                messageID: SessionMessage.ID.create(),
                timestamp: DateTime.makeUnsafe(started),
                callID: part.callID,
                command: input.command,
              })
            }
            return { msg, part, cwd: ctx.directory }
          }).pipe(Effect.ensuring(markReady))

          const cfg = yield* config.get()
          const sh = Shell.preferred(cfg.shell)
          const args = Shell.args(sh, input.command, cwd)
          let output = ""
          let aborted = false

          const finish = Effect.uninterruptible(
            Effect.gen(function* () {
              if (aborted) {
                output += "\n\n" + ["<metadata>", "User aborted the command", "</metadata>"].join("\n")
              }
              const completed = Date.now()
              if (flags.experimentalEventSystem) {
                yield* events.publish(SessionEvent.Shell.Ended, {
                  sessionID: input.sessionID,
                  timestamp: DateTime.makeUnsafe(completed),
                  callID: part.callID,
                  output,
                })
              }
              if (!msg.time.completed) {
                msg.time.completed = completed
                yield* sessions.updateMessage(msg)
              }
              if (part.state.status === "running") {
                part.state = {
                  status: "completed",
                  time: { ...part.state.time, end: completed },
                  input: part.state.input,
                  title: "",
                  metadata: { output, description: "" },
                  output,
                }
                yield* sessions.updatePart(part)
              }
            }),
          )

          const exit = yield* restore(
            Effect.gen(function* () {
              const shellEnv = yield* plugin.trigger(
                "shell.env",
                { cwd, sessionID: input.sessionID, callID: part.callID },
                { env: {} },
              )
              const cmd = ChildProcess.make(sh, args, {
                cwd,
                extendEnv: true,
                env: { ...shellEnv.env, TERM: "dumb" },
                stdin: "ignore",
                forceKillAfter: "3 seconds",
              })
              const handle = yield* spawner.spawn(cmd)
              yield* Stream.runForEach(Stream.decodeText(handle.all), (chunk) =>
                Effect.gen(function* () {
                  output += chunk
                  if (part.state.status === "running") {
                    part.state.metadata = { output, description: "" }
                    yield* sessions.updatePart(part)
                  }
                }),
              )
              yield* handle.exitCode
            }).pipe(Effect.scoped, Effect.orDie),
          ).pipe(Effect.exit)

          if (Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause) && !Cause.hasDies(exit.cause)) {
            aborted = true
          }
          yield* finish

          if (Exit.isFailure(exit) && !aborted && !Cause.hasInterruptsOnly(exit.cause)) {
            return yield* Effect.failCause(exit.cause)
          }

          return { info: msg, parts: [part] }
        }),
      )
    })

    const getModel = Effect.fn("SessionPrompt.getModel")(function* (
      providerID: ProviderV2.ID,
      modelID: ModelV2.ID,
      sessionID: SessionID,
    ) {
      const exit = yield* provider.getModel(providerID, modelID).pipe(Effect.exit)
      if (Exit.isSuccess(exit)) return exit.value
      const err = Cause.squash(exit.cause)
      if (Provider.ModelNotFoundError.isInstance(err)) {
        const hint = err.suggestions?.length ? ` Did you mean: ${err.suggestions.join(", ")}?` : ""
        yield* events.publish(Session.Event.Error, {
          sessionID,
          error: new NamedError.Unknown({
            message: `Model not found: ${err.providerID}/${err.modelID}.${hint}`,
          }).toObject(),
        })
      }
      return yield* Effect.die(err)
    })

    const currentModel = Effect.fnUntraced(function* (sessionID: SessionID) {
      const current = yield* db
        .select({ model: SessionTable.model })
        .from(SessionTable)
        .where(eq(SessionTable.id, sessionID))
        .get()
        .pipe(Effect.orDie)
      if (current?.model) {
        return {
          providerID: ProviderV2.ID.make(current.model.providerID),
          modelID: ModelV2.ID.make(current.model.id),
          ...(current.model.variant && current.model.variant !== "default" ? { variant: current.model.variant } : {}),
        }
      }
      const match = yield* sessions
        .findMessage(sessionID, (m) => m.info.role === "user" && !!m.info.model)
        .pipe(Effect.orDie)
      if (Option.isSome(match) && match.value.info.role === "user") return match.value.info.model
      return yield* provider.defaultModel().pipe(Effect.orDie)
    })

    const createUserMessage = Effect.fn("SessionPrompt.createUserMessage")(function* (input: PromptInput) {
      const agentName = input.agent
      const ag = agentName ? yield* agents.get(agentName) : yield* agents.defaultInfo()
      if (!ag) {
        const available = (yield* agents.list()).filter((a) => !a.hidden).map((a) => a.name)
        const hint = available.length ? ` Available agents: ${available.join(", ")}` : ""
        const error = new NamedError.Unknown({ message: `Agent not found: "${agentName}".${hint}` })
        yield* events.publish(Session.Event.Error, { sessionID: input.sessionID, error: error.toObject() })
        throw error
      }

      const current = yield* db
        .select({ agent: SessionTable.agent, model: SessionTable.model })
        .from(SessionTable)
        .where(eq(SessionTable.id, input.sessionID))
        .get()
        .pipe(Effect.orDie)
      const model = input.model ?? ag.model ?? (yield* currentModel(input.sessionID))
      const same = ag.model && model.providerID === ag.model.providerID && model.modelID === ag.model.modelID
      const full =
        !input.variant && ag.variant && same
          ? yield* provider
              .getModel(model.providerID, model.modelID)
              .pipe(Effect.catchIf(Provider.ModelNotFoundError.isInstance, () => Effect.succeed(undefined)))
          : undefined
      const variant = input.variant ?? (ag.variant && full?.variants?.[ag.variant] ? ag.variant : undefined)

      const info: SessionV1.User = {
        id: input.messageID ?? MessageID.ascending(),
        role: "user",
        sessionID: input.sessionID,
        time: { created: Date.now() },
        tools: input.tools,
        agent: ag.name,
        model: {
          providerID: model.providerID,
          modelID: model.modelID,
          variant,
        },
        system: input.system,
        format: input.format,
      }

      if (current?.agent !== info.agent) {
        yield* events.publish(SessionEvent.AgentSwitched, {
          sessionID: input.sessionID,
          messageID: SessionMessage.ID.create(),
          timestamp: DateTime.makeUnsafe(info.time.created),
          agent: info.agent,
        })
      }
      if (
        current?.model?.providerID !== info.model.providerID ||
        current.model.id !== info.model.modelID ||
        (current.model.variant === "default" ? undefined : current.model.variant) !== info.model.variant
      ) {
        yield* events.publish(SessionEvent.ModelSwitched, {
          sessionID: input.sessionID,
          messageID: SessionMessage.ID.create(),
          timestamp: DateTime.makeUnsafe(info.time.created),
          model: {
            id: ModelV2.ID.make(info.model.modelID),
            providerID: ProviderV2.ID.make(info.model.providerID),
            variant: ModelV2.VariantID.make(info.model.variant ?? "default"),
          },
        })
      }

      yield* Effect.addFinalizer(() => instruction.clear(info.id))

      type Draft<T> = T extends SessionV1.Part ? Omit<T, "id"> & { id?: string } : never
      const assign = (part: Draft<SessionV1.Part>): SessionV1.Part => ({
        ...part,
        id: part.id ? PartID.make(part.id) : PartID.ascending(),
      })

      const resolvePart: (part: PromptInput["parts"][number]) => Effect.Effect<Draft<SessionV1.Part>[]> = Effect.fn(
        "SessionPrompt.resolveUserPart",
      )(function* (part) {
        if (part.type === "file") {
          if (part.source?.type === "resource") {
            const { clientName, uri } = part.source
            log.info("mcp resource", { clientName, uri, mime: part.mime })
            const pieces: Draft<SessionV1.Part>[] = [
              {
                messageID: info.id,
                sessionID: input.sessionID,
                type: "text",
                synthetic: true,
                text: `Reading MCP resource: ${part.filename} (${uri})`,
              },
            ]
            const exit = yield* mcp.readResource(clientName, uri).pipe(Effect.exit)
            if (Exit.isSuccess(exit)) {
              const content = exit.value
              if (!content) throw new Error(`Resource not found: ${clientName}/${uri}`)
              const items = Array.isArray(content.contents) ? content.contents : [content.contents]
              for (const c of items) {
                if ("text" in c && c.text) {
                  pieces.push({
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: c.text,
                  })
                } else if ("blob" in c && c.blob) {
                  const mime = "mimeType" in c ? c.mimeType : part.mime
                  pieces.push({
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: `[Binary content: ${mime}]`,
                  })
                }
              }
              pieces.push({ ...part, messageID: info.id, sessionID: input.sessionID })
            } else {
              const error = Cause.squash(exit.cause)
              log.error("failed to read MCP resource", { error, clientName, uri })
              const message = error instanceof Error ? error.message : String(error)
              pieces.push({
                messageID: info.id,
                sessionID: input.sessionID,
                type: "text",
                synthetic: true,
                text: `Failed to read MCP resource ${part.filename}: ${message}`,
              })
            }
            return pieces
          }
          const url = new URL(part.url)
          switch (url.protocol) {
            case "data:":
              if (part.mime === "text/plain") {
                return [
                  {
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: `Called the Read tool with the following input: ${JSON.stringify({ filePath: part.filename })}`,
                  },
                  {
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: decodeDataUrl(part.url),
                  },
                  { ...part, messageID: info.id, sessionID: input.sessionID },
                ]
              }
              break
            case "file:": {
              log.info("file", { mime: part.mime })
              const filepath = fileURLToPath(part.url)
              const mime = (yield* fsys.isDir(filepath)) ? "application/x-directory" : part.mime

              const { read } = yield* registry.named()
              const execRead = (args: Parameters<typeof read.execute>[0], extra?: Tool.Context["extra"]) => {
                const controller = new AbortController()
                return read
                  .execute(args, {
                    sessionID: input.sessionID,
                    abort: controller.signal,
                    agent: input.agent!,
                    messageID: info.id,
                    extra: { bypassCwdCheck: true, ...extra },
                    messages: [],
                    metadata: () => Effect.void,
                    ask: () => Effect.void,
                  })
                  .pipe(Effect.onInterrupt(() => Effect.sync(() => controller.abort())))
              }

              if (mime === "text/plain") {
                let offset: number | undefined
                let limit: number | undefined
                const range = { start: url.searchParams.get("start"), end: url.searchParams.get("end") }
                if (range.start != null) {
                  const filePathURI = part.url.split("?")[0]
                  let start = parseInt(range.start)
                  let end = range.end ? parseInt(range.end) : undefined
                  if (start === end) {
                    const symbols = yield* lsp.documentSymbol(filePathURI).pipe(Effect.catch(() => Effect.succeed([])))
                    for (const symbol of symbols) {
                      let r: LSP.Range | undefined
                      if ("range" in symbol) r = symbol.range
                      else if ("location" in symbol) r = symbol.location.range
                      if (r?.start?.line && r?.start?.line === start) {
                        start = r.start.line
                        end = r?.end?.line ?? start
                        break
                      }
                    }
                  }
                  offset = Math.max(start, 1)
                  if (end) limit = end - (offset - 1)
                }
                const args = { filePath: filepath, offset, limit }
                const pieces: Draft<SessionV1.Part>[] = [
                  {
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: `Called the Read tool with the following input: ${JSON.stringify(args)}`,
                  },
                ]
                const exit = yield* provider.getModel(info.model.providerID, info.model.modelID).pipe(
                  Effect.flatMap((mdl) => execRead(args, { model: mdl })),
                  Effect.exit,
                )
                if (Exit.isSuccess(exit)) {
                  const result = exit.value
                  pieces.push({
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: result.output,
                  })
                  if (result.attachments?.length) {
                    pieces.push(
                      ...result.attachments.map((a) => ({
                        ...a,
                        synthetic: true,
                        filename: a.filename ?? part.filename,
                        messageID: info.id,
                        sessionID: input.sessionID,
                      })),
                    )
                  } else {
                    pieces.push({ ...part, mime, messageID: info.id, sessionID: input.sessionID })
                  }
                } else {
                  const error = Cause.squash(exit.cause)
                  log.error("failed to read file", { error })
                  const message = error instanceof Error ? error.message : String(error)
                  yield* events.publish(Session.Event.Error, {
                    sessionID: input.sessionID,
                    error: new NamedError.Unknown({ message }).toObject(),
                  })
                  pieces.push({
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: `Read tool failed to read ${filepath} with the following error: ${message}`,
                  })
                }
                return pieces
              }

              if (mime === "application/x-directory") {
                const args = { filePath: filepath }
                const exit = yield* execRead(args).pipe(Effect.exit)
                if (Exit.isFailure(exit)) {
                  const error = Cause.squash(exit.cause)
                  log.error("failed to read directory", { error })
                  const message = error instanceof Error ? error.message : String(error)
                  yield* events.publish(Session.Event.Error, {
                    sessionID: input.sessionID,
                    error: new NamedError.Unknown({ message }).toObject(),
                  })
                  return [
                    {
                      messageID: info.id,
                      sessionID: input.sessionID,
                      type: "text",
                      synthetic: true,
                      text: `Read tool failed to read ${filepath} with the following error: ${message}`,
                    },
                  ]
                }
                return [
                  {
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: `Called the Read tool with the following input: ${JSON.stringify(args)}`,
                  },
                  {
                    messageID: info.id,
                    sessionID: input.sessionID,
                    type: "text",
                    synthetic: true,
                    text: exit.value.output,
                  },
                  { ...part, mime, messageID: info.id, sessionID: input.sessionID },
                ]
              }

              return [
                {
                  messageID: info.id,
                  sessionID: input.sessionID,
                  type: "text",
                  synthetic: true,
                  text: `Called the Read tool with the following input: {"filePath":"${filepath}"}`,
                },
                {
                  id: part.id,
                  messageID: info.id,
                  sessionID: input.sessionID,
                  type: "file",
                  url:
                    `data:${mime};base64,` +
                    Buffer.from(yield* fsys.readFile(filepath).pipe(Effect.catch(Effect.die))).toString("base64"),
                  mime,
                  filename: part.filename!,
                  source: part.source,
                },
              ]
            }
          }
        }

        if (part.type === "agent") {
          const perm = Permission.evaluate("task", part.name, ag.permission)
          const hint = perm.action === "deny" ? " . Invoked by user; guaranteed to exist." : ""
          return [
            { ...part, messageID: info.id, sessionID: input.sessionID },
            {
              messageID: info.id,
              sessionID: input.sessionID,
              type: "text",
              synthetic: true,
              text:
                " Use the above message and context to generate a prompt and call the task tool with subagent: " +
                part.name +
                hint,
            },
          ]
        }

        return [{ ...part, messageID: info.id, sessionID: input.sessionID }]
      })

      const submittedParts: Types.DeepMutable<PromptInput["parts"]> = [...input.parts]
      const attachedReferences = new Set(
        input.parts.flatMap((part) =>
          part.type === "file" && part.mime === "application/x-directory" ? [part.url] : [],
        ),
      )
      for (const part of input.parts) {
        if (part.type !== "text" || part.synthetic) continue
        for (const reference of yield* resolveReferenceParts(part.text)) {
          if (reference.type === "file" && attachedReferences.has(reference.url)) continue
          if (reference.type === "file") attachedReferences.add(reference.url)
          submittedParts.push(reference)
        }
      }

      const resolvedParts = yield* Effect.forEach(submittedParts, resolvePart, { concurrency: "unbounded" }).pipe(
        Effect.map((x) => x.flat().map(assign)),
      )

      yield* plugin.trigger(
        "chat.message",
        {
          sessionID: input.sessionID,
          agent: input.agent,
          model: input.model,
          messageID: input.messageID,
          variant: input.variant,
        },
        { message: info, parts: resolvedParts },
      )

      const parts = yield* Effect.forEach(resolvedParts, (part) =>
        part.type === "file" && part.mime.startsWith("image/")
          ? image.normalize(part).pipe(
              Effect.catchIf(
                (error) => error instanceof Image.ResizerUnavailableError,
                () => Effect.succeed(part),
              ),
            )
          : Effect.succeed(part),
      )

      const parsed = decodeMessageInfo(info, { errors: "all", propertyOrder: "original" })
      if (Exit.isFailure(parsed)) {
        log.error("invalid user message before save", {
          sessionID: input.sessionID,
          messageID: info.id,
          agent: info.agent,
          model: info.model,
          cause: Cause.pretty(parsed.cause),
        })
      }
      parts.forEach((part, index) => {
        const p = decodeMessagePart(part, { errors: "all", propertyOrder: "original" })
        if (Exit.isSuccess(p)) return
        log.error("invalid user part before save", {
          sessionID: input.sessionID,
          messageID: info.id,
          partID: part.id,
          partType: part.type,
          index,
          cause: Cause.pretty(p.cause),
          part,
        })
      })

      yield* sessions.updateMessage(info)
      yield* Effect.forEach(parts, (part) => sessions.updatePart(part), { concurrency: "unbounded" })
      const nextPrompt = parts.reduce(
        (result, part) => {
          if (part.type === "text") {
            if (part.synthetic) result.synthetic.push(part.text)
            else result.text.push(part.text)
            const reference = referencePromptMetadata(part.metadata?.reference)
            if (reference) {
              result.references.push(
                new ReferenceAttachment({
                  name: reference.name,
                  kind: reference.kind,
                  uri: reference.path ? pathToFileURL(reference.path).href : undefined,
                  repository: reference.repository,
                  branch: reference.branch,
                  target: reference.target,
                  targetUri: reference.targetPath ? pathToFileURL(reference.targetPath).href : undefined,
                  problem: reference.problem,
                  source: new Source({
                    start: reference.source.start,
                    end: reference.source.end,
                    text: reference.source.value,
                  }),
                }),
              )
            }
          }
          if (part.type === "file") {
            result.files.push(
              new FileAttachment({
                uri: part.url,
                mime: part.mime,
                name: part.filename,
                source: part.source
                  ? new Source({
                      start: part.source.text.start,
                      end: part.source.text.end,
                      text: part.source.text.value,
                    })
                  : undefined,
              }),
            )
          }
          if (part.type === "agent") {
            result.agents.push(
              new AgentAttachment({
                name: part.name,
                source: part.source
                  ? new Source({
                      start: part.source.start,
                      end: part.source.end,
                      text: part.source.value,
                    })
                  : undefined,
              }),
            )
          }
          return result
        },
        {
          text: [] as string[],
          files: [] as FileAttachment[],
          agents: [] as AgentAttachment[],
          references: [] as ReferenceAttachment[],
          synthetic: [] as string[],
        },
      )
      // TODO(v2): Temporary dual-write while migrating session messages to v2 events.
      if (flags.experimentalEventSystem) {
        yield* events.publish(SessionEvent.Prompted, {
          sessionID: input.sessionID,
          messageID: SessionMessage.ID.create(),
          timestamp: DateTime.makeUnsafe(info.time.created),
          delivery: "steer",
          prompt: new Prompt({
            text: nextPrompt.text.join("\n"),
            files: nextPrompt.files,
            agents: nextPrompt.agents,
            references: nextPrompt.references,
          }),
        })
      }
      for (const text of nextPrompt.synthetic) {
        // TODO(v2): Temporary dual-write while migrating session messages to v2 events.
        if (flags.experimentalEventSystem) {
          yield* events.publish(SessionEvent.Synthetic, {
            sessionID: input.sessionID,
            messageID: SessionMessage.ID.create(),
            timestamp: DateTime.makeUnsafe(info.time.created),
            text,
          })
        }
      }

      return { info, parts }
    }, Effect.scoped)

    const prompt: (input: PromptInput) => Effect.Effect<SessionV1.WithParts, Image.Error> = Effect.fn(
      "SessionPrompt.prompt",
    )(function* (input: PromptInput) {
      const session = yield* sessions.get(input.sessionID).pipe(Effect.orDie)
      yield* revert.cleanup(session)
      const message = yield* createUserMessage(input)

      const permissions: PermissionV1.Rule[] = []
      for (const [t, enabled] of Object.entries(input.tools ?? {})) {
        permissions.push({ permission: t, action: enabled ? "allow" : "deny", pattern: "*" })
      }
      if (permissions.length > 0) {
        const merged = Permission.merge(session.permission ?? [], permissions)
        session.permission = merged
        yield* Effect.all([
          sessions.touch(input.sessionID),
          sessions.setPermission({ sessionID: session.id, permission: merged }),
        ])
      } else {
        yield* sessions.touch(input.sessionID)
      }

      if (input.noReply === true) return message

      // Fast path for simple greetings - skip full LLM processing
      const text = message.parts
        .filter((p): p is SessionV1.TextPart => p.type === "text" && !p.synthetic && !p.ignored)
        .map((p) => p.text)
        .join(" ")
        .trim()
      
      if (GREETINGS.test(text) && text.split(" ").length <= 3) {
        // Quick response for simple greetings with varied tones
        const lowerText = text.toLowerCase().replace(/[!?.]+$/, "")
        
        // Multi-language greetings with varied responses
        const greetingResponses: Array<{ patterns: string[]; responses: string[] }> = [
          // English
          { patterns: ["hi", "hey", "hello", "howdy", "helu", "helo", "hai"], responses: ["Hey there!", "Hi!", "Hello!", "Hey!", "What's up!", "Hi there!", "Hey babe!", "Hi señorita!", "Aye aye captain!", "Yes my lord, how may I help?", "Yes my majesty, how may I help?", "At your command, master!", "Hi senpai!", "Hello tiny human!"] },
          { patterns: ["thanks", "thank you", "thx", "ty"], responses: ["You're welcome!", "No problem!", "Anytime!", "Happy to help!", "Sure thing!"] },
          { patterns: ["ok", "okay", "k", "got it", "understood"], responses: ["Got it!", "Roger that!", "Done!", "Makes sense!", "Noted!"] },
          { patterns: ["bye", "goodbye", "see you", "later"], responses: ["See you!", "Bye!", "Take care!", "Later!", "Until next time!"] },
          { patterns: ["cool", "nice", "great", "awesome", "perfect", "amazing"], responses: ["Thanks!", "Glad you like it!", "Awesome!", "Sweet!", "Rock on!"] },
          { patterns: ["yes", "yep", "yeah", "sure", "definitely"], responses: ["Alright!", "Got it!", "On it!", "You got it!", "Absolutely!"] },
          { patterns: ["no", "nope", "nah"], responses: ["Okay!", "No worries!", "Got it!", "Understood!"] },
          { patterns: ["sorry", "apologies", "my bad"], responses: ["No worries!", "It's all good!", "Don't worry about it!", "No problem!"] },
          { patterns: ["haha", "hahaha", "huhaha", "lol", "lmao", "rofl", "hahahaha", "hehe", "hehehe"], responses: ["Ha!", "What's so funny? 😄", "I see you're having fun!", "Glad I could make you laugh!", "😂", "You're killing me!", "That's hilarious!"] },
          
          // Spanish
          { patterns: ["hola", "buenos dias", "buenas"], responses: ["¡Hola!", "¡Buenos días!", "¡Hola, qué tal!", "¡Qué tal!", "¡Hola babe!", "¡Hola señorita!", "¡Hola capitan!"] },
          { patterns: ["gracias", "grac"], responses: ["¡De nada!", "¡Con gusto!", "¡No hay de qué!"] },
          { patterns: ["adiós", "hasta luego", "chao"], responses: ["¡Hasta luego!", "¡Adiós!", "¡Nos vemos!", "¡Chao!"] },
          
          // Playful / Personality
          { patterns: ["aye aye", "captain"], responses: ["Aye aye, captain!", "At your service, captain!", "Reporting for duty!", "Aye aye, ready to go!"] },
          { patterns: ["yes my lord", "my lord"], responses: ["At your service, my lord!", "Yes, my lord!", "Your wish is my command!", "How may I assist you, my lord?"] },
          { patterns: ["hola babe", "babe"], responses: ["Hola babe!", "Hey babe!", "What's up, babe!"] },
          { patterns: ["senorita", "señorita"], responses: ["Hola señorita!", "¡Hola, señorita!", "At your service, señorita!"] },
          
          // French
          { patterns: ["salut", "bonjour", "bonsoir"], responses: ["Salut!", "Bonjour!", "Bonsoir!", "Coucou!"] },
          { patterns: ["merci", "merci beaucoup"], responses: ["De rien!", "Avec plaisir!", "Je vous en prie!"] },
          { patterns: ["au revoir", "à bientôt"], responses: ["Au revoir!", "À bientôt!", "Salut!"] },
          
          // German
          { patterns: ["hallo", "guten tag", "hi"], responses: ["Hallo!", "Guten Tag!", "Hi!"] },
          { patterns: ["danke", "vielen dank"], responses: ["Bitte!", "Gern geschehen!", "Kein Problem!"] },
          { patterns: ["tschüss", "auf wiedersehen"], responses: ["Tschüss!", "Bis bald!", "Auf Wiedersehen!"] },
          
          // Portuguese
          { patterns: ["olá", "oi", "bom dia"], responses: ["Olá!", "Oi!", "Bom dia!", "Oi, tudo bem!"] },
          { patterns: ["obrigado", "obrigada", "valeu"], responses: ["De nada!", "Por nada!", "Tamo junto!"] },
          { patterns: ["tchau", "adeus"], responses: ["Tchau!", "Até logo!", "Até mais!"] },
          
          // Italian
          { patterns: ["ciao", "salve", "buongiorno"], responses: ["Ciao!", "Salve!", "Buongiorno!", "Hey!"] },
          { patterns: ["grazie", "grazie mille"], responses: ["Prego!", "Di niente!", "Non c'è di che!"] },
          { patterns: ["arrivederci", "ciao"], responses: ["Arrivederci!", "A presto!", "Ciao!"] },
          
          // Japanese
          { patterns: ["こんにちは", "konnichiwa", "ohayo"], responses: ["こんにちは!", "お元気ですか!", "やあ!"] },
          { patterns: ["ありがとう", "arigatou", "thanks"], responses: ["どういたしまして!", "よろしく!"] },
          { patterns: ["さようなら", "sayounara", "bye"], responses: ["さようなら!", "またね!", "バイバイ!"] },
          
          // Korean
          { patterns: ["안녕하세요", "annyeonghaseyo", "annyeong"], responses: ["안녕하세요!", "반가워요!", "안녕!"] },
          { patterns: ["감사합니다", "gamsahamnida", "고마워"], responses: ["천만에요!", "별말씀을요!", "감사!"] },
          
          // Hindi
          { patterns: ["नमस्ते", "namaste", "namaskar"], responses: ["नमस्ते!", "नमस्कार!", "आप कैसे हैं!"] },
          { patterns: ["धन्यवाद", "dhanyavad", "shukriya"], responses: ["स्वागत है!", "कोई बात नहीं!", "आपका स्वागत है!"] },
          
          // Arabic
          { patterns: ["مرحبا", "marhaba", "ahlan", "salaam"], responses: ["مرحبا!", "أهلاً!", "السلام عليكم!"] },
          { patterns: ["شكرا", "shukran"], responses: ["عفواً!", "الشكر لله!", "لا شكر على واجب!"] },
          
          // Russian
          { patterns: ["привет", "privet", "здравствуйте"], responses: ["Привет!", "Здравствуйте!", "Приветствую!"] },
          { patterns: ["спасибо", "spasibo"], responses: ["Пожалуйста!", "Не за что!", "На здоровье!"] },
          
          // Turkish
          { patterns: ["merhaba", "selam"], responses: ["Merhaba!", "Selam!", "N'aber!"] },
          { patterns: ["teşekkürler", "tesekkurler"], responses: ["Rica ederim!", "Ne demek!", "Bir şey değil!"] },
        ]
        
        // Find matching greeting and pick a random response
        for (const greeting of greetingResponses) {
          if (greeting.patterns.includes(lowerText)) {
            const quickReply = greeting.responses[Math.floor(Math.random() * greeting.responses.length)]
            
            // Create assistant message with quick reply
            const assistantMessage: SessionV1.Assistant = yield* sessions.updateMessage({
              id: MessageID.ascending(),
              role: "assistant",
              parentID: message.info.id,
              sessionID: input.sessionID,
              mode: "build",
              agent: message.info.agent,
              variant: message.info.model.variant,
              path: { cwd: "", root: "" },
              cost: 0,
              tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
              modelID: message.info.model.modelID,
              providerID: message.info.model.providerID,
              time: { created: Date.now() },
            })
            yield* sessions.updatePart({
              id: PartID.ascending(),
              messageID: assistantMessage.id,
              sessionID: input.sessionID,
              type: "text",
              text: quickReply,
            })
            yield* status.set(input.sessionID, { type: "idle" })
            const msgs = yield* sessions.messages({ sessionID: input.sessionID, limit: 1 }).pipe(Effect.orDie)
            return msgs[0]
          }
        }
      }

      return yield* loop({ sessionID: input.sessionID }).pipe(
        Effect.catchCause((cause) =>
          Effect.gen(function* () {
            const error = Cause.squash(cause)
            const errorMsg = error instanceof Error ? error.message : String(error)
            yield* elog.error("prompt loop failed", { sessionID: input.sessionID, error: errorMsg })
            yield* events.publish(Session.Event.Error, {
              sessionID: input.sessionID,
              error: new NamedError.Unknown({ message: `Agent failed to respond: ${errorMsg}` }).toObject(),
            })
            yield* status.set(input.sessionID, { type: "idle" })
            return yield* Effect.failCause(cause)
          }),
        ),
      )
    })

    const lastAssistant = Effect.fnUntraced(function* (sessionID: SessionID) {
      const match = yield* sessions.findMessage(sessionID, (m) => m.info.role !== "user").pipe(Effect.orDie)
      if (Option.isSome(match)) return match.value
      const msgs = yield* sessions.messages({ sessionID, limit: 1 }).pipe(Effect.orDie)
      if (msgs.length > 0) return msgs[0]
      throw new Error("Impossible")
    })

    const runLoop = Effect.fn("SessionPrompt.run")(
      function* (sessionID: SessionID) {
        const ctx = yield* InstanceState.context
        const slog = elog.with({ sessionID })
        let structured: unknown
        let step = 0
        const session = yield* sessions.get(sessionID).pipe(Effect.orDie)

        while (true) {
          yield* status.set(sessionID, { type: "busy" })
          yield* slog.info("loop", { step })

          let msgs = yield* MessageV2.filterCompactedEffect(sessionID).pipe(
            Effect.provideService(Database.Service, database),
          )

          const { user: lastUser, assistant: lastAssistant, finished: lastFinished, tasks } = MessageV2.latest(msgs)

          if (!lastUser) throw new Error("No user message found in stream. This should never happen.")

          const lastAssistantMsg = msgs.findLast(
            (msg) => msg.info.role === "assistant" && msg.info.id === lastAssistant?.id,
          )
          // Some providers return "stop" even when the assistant message contains
          // tool calls. Keep the loop running so tool results can be sent back to
          // the model, but ignore cleanup-marked interrupted orphans.
          const hasToolCalls =
            lastAssistantMsg?.parts.some(
              (part) => part.type === "tool" && !part.metadata?.providerExecuted && !isOrphanedInterruptedTool(part),
            ) ?? false

          if (
            lastAssistant?.finish &&
            !["tool-calls"].includes(lastAssistant.finish) &&
            !hasToolCalls &&
            lastUser.id < lastAssistant.id
          ) {
            const orphan = lastAssistantMsg?.parts.find(
              (part): part is SessionV1.ToolPart => part.type === "tool" && isOrphanedInterruptedTool(part),
            )
            if (orphan) {
              yield* slog.warn("loop exit with orphaned interrupted tool", {
                messageID: lastAssistant.id,
                tool: orphan.tool,
                callID: orphan.callID,
              })
            }
            yield* slog.info("exiting loop")
            break
          }

          step++
          if (step === 1) {
            yield* generateLocalTitle(sessionID, msgs).pipe(Effect.ignore)
            yield* title({
              session,
              modelID: lastUser.model.modelID,
              providerID: lastUser.model.providerID,
              history: msgs,
            }).pipe(Effect.ignore, Effect.forkIn(scope))
          } else if (step % 3 === 0) {
            yield* title({
              session,
              modelID: lastUser.model.modelID,
              providerID: lastUser.model.providerID,
              history: msgs,
              force: true,
            }).pipe(Effect.ignore, Effect.forkIn(scope))
          }

          const agent = yield* agents.get(lastUser.agent)
          if (!agent) {
            const available = (yield* agents.list()).filter((a) => !a.hidden).map((a) => a.name)
            const hint = available.length ? ` Available agents: ${available.join(", ")}` : ""
            const error = new NamedError.Unknown({ message: `Agent not found: "${lastUser.agent}".${hint}` })
            yield* events.publish(Session.Event.Error, { sessionID, error: error.toObject() })
            throw error
          }

          const model = yield* getModel(lastUser.model.providerID, lastUser.model.modelID, sessionID)
          const task = tasks.pop()

          if (task?.type === "subtask") {
            yield* handleSubtask({ task, model, lastUser, sessionID, session, msgs })
            continue
          }

          if (task?.type === "compaction") {
            const result = yield* compaction.process({
              messages: msgs,
              parentID: lastUser.id,
              sessionID,
              auto: task.auto,
              overflow: task.overflow,
            })
            if (result === "stop") break
            continue
          }

          if (
            lastFinished &&
            lastFinished.summary !== true &&
            (yield* compaction.isOverflow({ tokens: lastFinished.tokens, model }))
          ) {
            yield* compaction.create({ sessionID, agent: lastUser.agent, model: lastUser.model, auto: true })
            continue
          }

          const maxSteps = agent.steps ?? Infinity
          const isLastStep = step >= maxSteps
          msgs = yield* SessionReminders.apply({ messages: msgs, agent, session }).pipe(
            Effect.provideService(RuntimeFlags.Service, flags),
            Effect.provideService(FSUtil.Service, fsys),
            Effect.provideService(Session.Service, sessions),
          )

          if (agent.name === AGENT_SWARM_AGENT) {
            const msg: SessionV1.Assistant = {
              id: MessageID.ascending(),
              parentID: lastUser.id,
              role: "assistant",
              mode: agent.name,
              agent: agent.name,
              variant: lastUser.model.variant,
              path: { cwd: ctx.directory, root: ctx.worktree },
              cost: 0,
              tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
              modelID: model.id,
              providerID: model.providerID,
              time: { created: Date.now() },
              sessionID,
            }
            yield* sessions.updateMessage(msg)

            const started = Date.now()
            const part: SessionV1.TextPart = {
              id: PartID.ascending(),
              messageID: msg.id,
              sessionID,
              type: "text",
              text: "",
              time: { start: started },
              metadata: {
                agent_swarm: true,
                agent_swarm_events: [] as Array<{
                  type: string
                  agent?: string
                  message?: string
                  detail?: Record<string, unknown>
                  timestamp: number
                }>,
              },
            }
            yield* sessions.updatePart(part)

            const swarmRoot = path.resolve(process.env.AGENT_SWARM_HOME || AGENT_SWARM_DEFAULT_DIR)
            const swarmMain = path.join(swarmRoot, "main.py")
            const python = process.env.AGENT_SWARM_PYTHON || "python"
            const lastUserWithParts = msgs.find((message) => message.info.id === lastUser.id)
            const promptText = (lastUserWithParts ? agentSwarmPromptText(lastUserWithParts) : "") || "Continue the current task."

            const pythonPath = process.env.PYTHONPATH
              ? `${swarmRoot}${path.delimiter}${process.env.PYTHONPATH}`
              : swarmRoot
            const allowedRoots = Array.from(new Set([ctx.worktree, ctx.directory].filter(Boolean))).join(path.delimiter)

            let exitCode: number | undefined
            let rawLines: string[] = []
            const events: Array<{ type: string; agent?: string; message?: string; detail?: Record<string, unknown>; timestamp: number }> = []
            const agentsMap = new Map<string, { status: string; model?: string; message?: string }>()

            const exit = yield* Effect.gen(function* () {
              const child = ChildProcess.make(python, [swarmMain, "--headless", promptText], {
                cwd: ctx.directory,
                extendEnv: true,
                env: {
                  PYTHONPATH: pythonPath,
                  AGENT_SWARM_ALLOWED_ROOTS: allowedRoots,
                  OCTOCODE_AGENT_SWARM: "1",
                  TERM: "dumb",
                },
                stdin: "ignore",
                forceKillAfter: "5 seconds",
              })
              const handle = yield* spawner.spawn(child)

              let buffer = ""
              const decoder = new TextDecoder()
              let pendingText = ""
              let flushScheduled = false
              let finalFlush = false

              function renderText(): string {
                const lines: string[] = []
                lines.push("## Agent Swarm")
                lines.push("")

                if (agentsMap.size > 0) {
                  lines.push("### Agents")
                  for (const [name, info] of agentsMap) {
                    const icon = info.status === "running" ? "●" : info.status === "completed" ? "✓" : "○"
                    lines.push(`- ${icon} **${name}**${info.model ? ` (${info.model})` : ""}${info.message ? ` — ${info.message}` : ""}`)
                  }
                  lines.push("")
                }

                for (const evt of events) {
                  if (evt.type === "council_decision") {
                    lines.push("### Council Decision")
                    lines.push(`- Verdict: **${(evt.detail as any)?.verdict ?? "N/A"}** (${(evt.detail as any)?.confidence ?? 0}% confidence)`)
                    const y = (evt.detail as any)?.yes_votes ?? 0
                    const n = (evt.detail as any)?.no_votes ?? 0
                    lines.push(`- Vote: ${y}/${y + n} YES`)
                    const opinions = (evt.detail as any)?.opinions
                    if (opinions?.length) {
                      lines.push("")
                      for (const op of opinions) {
                        lines.push(`  - **${op.agent_name}**: ${op.stance} (${op.confidence}%)`)
                        if (op.reasoning) lines.push(`    ${op.reasoning}`)
                      }
                    }
                    lines.push("")
                  }

                  if (evt.type === "agent_reply") {
                    lines.push("### Final Response")
                    lines.push(`**${evt.agent}**:`)
                    lines.push(evt.message ?? "")
                    lines.push("")
                  }

                  if (evt.type === "swarm_complete") {
                    lines.push("---")
                    lines.push(`Turns: ${(evt.detail as any)?.turns ?? 0} | Tokens: ${(evt.detail as any)?.tokens ?? 0} | Duration: ${(evt.detail as any)?.duration_ms ?? 0}ms`)
                  }
                }

                return lines.join("\n")
              }

              function flushPart() {
                flushScheduled = false
                if (!finalFlush && !pendingText) return
                part.text = pendingText || renderText()
                if (part.metadata) {
                  part.metadata.agent_swarm_events = events
                }
                void Effect.runPromise(sessions.updatePart(part))
              }

              function scheduleFlush() {
                if (flushScheduled || finalFlush) return
                flushScheduled = true
                setTimeout(() => {
                  pendingText = renderText()
                  flushPart()
                }, 200)
              }

              yield* Stream.runForEach(Stream.decodeText(handle.stdout), (chunk) => {
                return Effect.gen(function* () {
                  buffer += chunk
                  const lines = buffer.split("\n")
                  buffer = lines.pop() ?? ""

                  for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed) continue
                    rawLines.push(trimmed)

                    try {
                      const event = JSON.parse(trimmed)
                      if (event.type) {
                        const evt = {
                          type: event.type,
                          agent: event.agent,
                          message: event.message,
                          detail: event.detail,
                          timestamp: Date.now(),
                        }
                        events.push(evt)

                        if (event.type === "agent_progress" && event.agent) {
                          agentsMap.set(event.agent, {
                            status: "running",
                            message: event.message,
                            model: event.detail?.model as string | undefined,
                          })
                        }
                        if (event.type === "agent_reply" && event.agent) {
                          agentsMap.set(event.agent, {
                            status: "completed",
                            message: event.output?.slice(0, 100),
                          })
                        }
                        if (event.type === "swarm_complete" && event.agents_used) {
                          for (const a of event.agents_used as string[]) {
                            if (!agentsMap.has(a)) agentsMap.set(a, { status: "completed" })
                          }
                        }

                        const renderLines: string[] = []
                        renderLines.push("## Agent Swarm")
                        renderLines.push("")

                        if (agentsMap.size > 0) {
                          renderLines.push("### Agents")
                          for (const [name, info] of agentsMap) {
                            const icon = info.status === "running" ? "●" : info.status === "completed" ? "✓" : "○"
                            renderLines.push(`- ${icon} **${name}**${info.model ? ` (${info.model})` : ""}${info.message ? ` — ${info.message}` : ""}`)
                          }
                          renderLines.push("")
                        }

                        if (event.type === "council_decision") {
                          renderLines.push("### Council Decision")
                          renderLines.push(`- Verdict: **${event.verdict}** (${event.confidence}% confidence)`)
                          renderLines.push(`- Vote: ${event.yes_votes}/${(event.yes_votes ?? 0) + (event.no_votes ?? 0)} YES`)
                          if (event.opinions?.length) {
                            renderLines.push("")
                            for (const op of event.opinions) {
                              renderLines.push(`  - **${op.agent_name}**: ${op.stance} (${op.confidence}%)`)
                              if (op.reasoning) renderLines.push(`    ${op.reasoning}`)
                            }
                          }
                          renderLines.push("")
                        }

                        if (event.type === "agent_reply") {
                          renderLines.push("### Final Response")
                          renderLines.push(`**${event.agent}**:`)
                          renderLines.push(event.output ?? "")
                          renderLines.push("")
                        }

                        if (event.type === "swarm_complete") {
                          renderLines.push("---")
                          renderLines.push(`Turns: ${event.turns} | Tokens: ${event.tokens} | Duration: ${event.duration_ms}ms`)
                        }

                        if (event.type === "status") {
                          renderLines.push(`> ${event.message}`)
                          renderLines.push("")
                        }

                        part.text = renderLines.join("\n")
                        if (part.metadata) {
                          part.metadata.agent_swarm_events = events
                        }
                        yield* sessions.updatePart(part)
                      }
                    } catch {
                      rawLines.push(trimmed)
                    }
                  }
                })
              })

              exitCode = yield* handle.exitCode
            }).pipe(Effect.scoped, Effect.exit)

            const completed = Date.now()

            if (Exit.isFailure(exit)) {
              const error = Cause.pretty(exit.cause)
              const header = `## Agent Swarm\n\n> Error: ${error.slice(0, 500)}`
              part.text = header
            } else if (events.length === 0) {
              const raw = rawLines.join("\n").trim()
              part.text = `## Agent Swarm\n\n${raw || "Agent Swarm finished without output."}`
              if (exitCode && exitCode !== 0) {
                part.text += `\n\n> Exited with status ${exitCode}`
              }
            }

            part.time = { start: started, end: completed }
            if (part.metadata) {
              part.metadata.agent_swarm_events = events
            }
            yield* sessions.updatePart(part)
            msg.time.completed = completed
            msg.finish = exitCode === 0 ? "stop" : "error"
            yield* sessions.updateMessage(msg)
            break
          }

          const msg: SessionV1.Assistant = {
            id: MessageID.ascending(),
            parentID: lastUser.id,
            role: "assistant",
            mode: agent.name,
            agent: agent.name,
            variant: lastUser.model.variant,
            path: { cwd: ctx.directory, root: ctx.worktree },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            modelID: model.id,
            providerID: model.providerID,
            time: { created: Date.now() },
            sessionID,
          }
          yield* sessions.updateMessage(msg)

          const finalizeInterruptedAssistant = Effect.gen(function* () {
            if (msg.time.completed) return
            msg.error ??= MessageV2.fromError(new DOMException("Aborted", "AbortError"), {
              providerID: msg.providerID,
              aborted: true,
            })
            msg.time.completed = Date.now()
            yield* sessions.updateMessage(msg)
          })

          const handle = yield* processor
            .create({
              assistantMessage: msg,
              sessionID,
              model,
            })
            .pipe(Effect.onInterrupt(() => finalizeInterruptedAssistant))

          const outcome: "break" | "continue" = yield* Effect.gen(function* () {
            const lastUserMsg = msgs.findLast((m) => m.info.role === "user")
            const bypassAgentCheck = lastUserMsg?.parts.some((p) => p.type === "agent") ?? false
            const promptOps = yield* ops()

            const tools = yield* SessionTools.resolve({
              agent,
              session,
              model,
              processor: handle,
              bypassAgentCheck,
              messages: msgs,
              promptOps,
            }).pipe(
              Effect.provideService(Plugin.Service, plugin),
              Effect.provideService(Permission.Service, permission),
              Effect.provideService(ToolRegistry.Service, registry),
              Effect.provideService(MCP.Service, mcp),
              Effect.provideService(Truncate.Service, truncate),
            )

            if (lastUser.format?.type === "json_schema") {
              tools["StructuredOutput"] = createStructuredOutputTool({
                schema: lastUser.format.schema,
                onSuccess(output) {
                  structured = output
                },
              })
            }

            if (step === 1)
              yield* summary.summarize({ sessionID, messageID: lastUser.id }).pipe(Effect.ignore, Effect.forkIn(scope))

            if (step > 1 && lastFinished) {
              for (const m of msgs) {
                if (m.info.role !== "user" || m.info.id <= lastFinished.id) continue
                for (const p of m.parts) {
                  if (p.type !== "text" || p.ignored || p.synthetic) continue
                  if (!p.text.trim()) continue
                  p.text = [
                    "<system-reminder>",
                    "The user sent the following message:",
                    p.text,
                    "",
                    "Please address this message and continue with your tasks.",
                    "</system-reminder>",
                  ].join("\n")
                }
              }
            }

            yield* plugin.trigger("experimental.chat.messages.transform", {}, { messages: msgs })

            const [skills, env, instructions, modelMsgs] = yield* Effect.all([
              sys.skills(agent),
              sys.environment(model),
              instruction.system().pipe(Effect.orDie),
              MessageV2.toModelMessagesEffect(msgs, model),
            ])
            const system = [...env, ...instructions, ...(skills ? [skills] : [])]
            const format = lastUser.format ?? { type: "text" as const }
            if (format.type === "json_schema") system.push(STRUCTURED_OUTPUT_SYSTEM_PROMPT)
            const result = yield* handle.process({
              user: lastUser,
              agent,
              permission: session.permission,
              sessionID,
              parentSessionID: session.parentID,
              system,
              messages: [...modelMsgs, ...(isLastStep ? [{ role: "assistant" as const, content: MAX_STEPS }] : [])],
              tools,
              model,
              toolChoice: format.type === "json_schema" ? "required" : undefined,
            })

            if (structured !== undefined) {
              handle.message.structured = structured
              handle.message.finish = handle.message.finish ?? "stop"
              yield* sessions.updateMessage(handle.message)
              return "break" as const
            }

            const finished = handle.message.finish && !["tool-calls", "unknown"].includes(handle.message.finish)
            if (finished && !handle.message.error) {
              if (format.type === "json_schema") {
                handle.message.error = new SessionV1.StructuredOutputError({
                  message: "Model did not produce structured output",
                  retries: 0,
                }).toObject()
                yield* sessions.updateMessage(handle.message)
                return "break" as const
              }
            }

            if (result === "stop") return "break" as const
            if (result === "compact") {
              yield* compaction.create({
                sessionID,
                agent: lastUser.agent,
                model: lastUser.model,
                auto: true,
                overflow: !handle.message.finish,
              })
            }
            return "continue" as const
          }).pipe(
            Effect.ensuring(instruction.clear(handle.message.id)),
            Effect.onInterrupt(() => finalizeInterruptedAssistant),
          )
          if (outcome === "break") break
          continue
        }

        yield* compaction.prune({ sessionID }).pipe(Effect.ignore, Effect.forkIn(scope))
        return yield* lastAssistant(sessionID)
      },
    )

    const loop: (input: LoopInput) => Effect.Effect<SessionV1.WithParts> = Effect.fn("SessionPrompt.loop")(function* (
      input: LoopInput,
    ) {
      return yield* state.ensureRunning(input.sessionID, lastAssistant(input.sessionID), runLoop(input.sessionID)).pipe(
        Effect.timeout("10 minutes"),
        Effect.catchTag("TimeoutException", () =>
          Effect.gen(function* () {
            yield* elog.error("loop timed out", { sessionID: input.sessionID })
            yield* events.publish(Session.Event.Error, {
              sessionID: input.sessionID,
              error: new NamedError.Unknown({ message: "Agent response timed out after 10 minutes" }).toObject(),
            })
            yield* status.set(input.sessionID, { type: "idle" })
            return yield* lastAssistant(input.sessionID)
          }),
        ),
      )
    })

    const shell: (input: ShellInput) => Effect.Effect<SessionV1.WithParts, Session.BusyError> = Effect.fn(
      "SessionPrompt.shell",
    )(function* (input: ShellInput) {
      const ready = yield* Latch.make()
      return yield* state.startShell(input.sessionID, lastAssistant(input.sessionID), shellImpl(input, ready), ready)
    })

    const command = Effect.fn("SessionPrompt.command")(function* (input: CommandInput) {
      yield* elog.info("command", { sessionID: input.sessionID, command: input.command, agent: input.agent })
      const cmd = yield* commands.get(input.command)
      if (!cmd) {
        const available = (yield* commands.list()).map((c) => c.name)
        const hint = available.length ? ` Available commands: ${available.join(", ")}` : ""
        const error = new NamedError.Unknown({ message: `Command not found: "${input.command}".${hint}` })
        yield* events.publish(Session.Event.Error, { sessionID: input.sessionID, error: error.toObject() })
        throw error
      }
      const agentName = cmd.agent ?? input.agent

      const raw = input.arguments.match(argsRegex) ?? []
      const args = raw.map((arg) => arg.replace(quoteTrimRegex, ""))
      const templateCommand = yield* Effect.promise(async () => cmd.template)

      const placeholders = templateCommand.match(placeholderRegex) ?? []
      let last = 0
      for (const item of placeholders) {
        const value = Number(item.slice(1))
        if (value > last) last = value
      }

      const withArgs = templateCommand.replaceAll(placeholderRegex, (_, index) => {
        const position = Number(index)
        const argIndex = position - 1
        if (argIndex >= args.length) return ""
        if (position === last) return args.slice(argIndex).join(" ")
        return args[argIndex]
      })
      const usesArgumentsPlaceholder = templateCommand.includes("$ARGUMENTS")
      let template = withArgs.replaceAll("$ARGUMENTS", input.arguments)

      if (placeholders.length === 0 && !usesArgumentsPlaceholder && input.arguments.trim()) {
        template = template + "\n\n" + input.arguments
      }

      const shellMatches = ConfigMarkdown.shell(template)
      if (shellMatches.length > 0) {
        const cfg = yield* config.get()
        const sh = Shell.preferred(cfg.shell)
        const results = yield* Effect.promise(() =>
          Promise.all(
            shellMatches.map(async ([, cmd]) => (await Process.text([cmd], { shell: sh, nothrow: true })).text),
          ),
        )
        let index = 0
        template = template.replace(bashRegex, () => results[index++])
      }
      template = template.trim()

      const taskModel = yield* Effect.gen(function* () {
        if (cmd.model) return Provider.parseModel(cmd.model)
        if (cmd.agent) {
          const cmdAgent = yield* agents.get(cmd.agent)
          if (cmdAgent?.model) return cmdAgent.model
        }
        if (input.model) return Provider.parseModel(input.model)
        return yield* currentModel(input.sessionID)
      })

      yield* getModel(taskModel.providerID, taskModel.modelID, input.sessionID)

      const agent = agentName ? yield* agents.get(agentName) : yield* agents.defaultInfo()
      if (!agent) {
        const available = (yield* agents.list()).filter((a) => !a.hidden).map((a) => a.name)
        const hint = available.length ? ` Available agents: ${available.join(", ")}` : ""
        const error = new NamedError.Unknown({ message: `Agent not found: "${agentName}".${hint}` })
        yield* events.publish(Session.Event.Error, { sessionID: input.sessionID, error: error.toObject() })
        throw error
      }

      const templateParts = yield* resolvePromptParts(template)
      const isSubtask = (agent.mode === "subagent" && cmd.subtask !== false) || cmd.subtask === true
      const parts = isSubtask
        ? [
            {
              type: "subtask" as const,
              agent: agent.name,
              description: cmd.description ?? "",
              command: input.command,
              model: { providerID: taskModel.providerID, modelID: taskModel.modelID },
              prompt: templateParts.find((y) => y.type === "text")?.text ?? "",
            },
          ]
        : [...templateParts, ...(input.parts ?? [])]

      const userAgent = isSubtask ? (input.agent ?? (yield* agents.defaultInfo()).name) : agent.name
      const userModel = isSubtask
        ? input.model
          ? Provider.parseModel(input.model)
          : yield* currentModel(input.sessionID)
        : taskModel

      yield* plugin.trigger(
        "command.execute.before",
        { command: input.command, sessionID: input.sessionID, arguments: input.arguments },
        { parts },
      )

      const result = yield* prompt({
        sessionID: input.sessionID,
        messageID: input.messageID,
        model: userModel,
        agent: userAgent,
        parts,
        variant: input.variant,
      })
      yield* events.publish(Command.Event.Executed, {
        name: input.command,
        sessionID: input.sessionID,
        arguments: input.arguments,
        messageID: result.info.id,
      })
      return result
    })

    return Service.of({
      cancel,
      prompt,
      loop,
      shell,
      command,
      resolvePromptParts,
    })
  }),
)

export const defaultLayer = Layer.suspend(() =>
  layer.pipe(
    Layer.provide(SessionRunState.defaultLayer),
    Layer.provide(SessionStatus.defaultLayer),
    Layer.provide(SessionCompaction.defaultLayer),
    Layer.provide(SessionProcessor.defaultLayer),
    Layer.provide(Command.defaultLayer),
    Layer.provide(Permission.defaultLayer),
    Layer.provide(MCP.defaultLayer),
    Layer.provide(LSP.defaultLayer),
    Layer.provide(ToolRegistry.defaultLayer),
    Layer.provide(Truncate.defaultLayer),
    Layer.provide(Provider.defaultLayer),
    Layer.provide(Config.defaultLayer),
    Layer.provide(Instruction.defaultLayer),
    Layer.provide(FSUtil.defaultLayer),
    Layer.provide(Plugin.defaultLayer),
    Layer.provide(Session.defaultLayer),
    Layer.provide(SessionRevert.defaultLayer),
    Layer.provide(SessionSummary.defaultLayer),
    Layer.provide(Image.defaultLayer),
    Layer.provide(
      Layer.mergeAll(
        Agent.defaultLayer,
        Database.defaultLayer,
        SystemPrompt.defaultLayer,
        LLM.defaultLayer,
        Reference.defaultLayer,
        CrossSpawnSpawner.defaultLayer,
        RuntimeFlags.defaultLayer,
        EventV2Bridge.defaultLayer,
      ),
    ),
  ),
)
const ModelRef = Schema.Struct({
  providerID: ProviderV2.ID,
  modelID: ModelV2.ID,
})

export const PromptInput = Schema.Struct({
  sessionID: SessionID,
  messageID: Schema.optional(MessageID),
  model: Schema.optional(ModelRef),
  agent: Schema.optional(Schema.String),
  noReply: Schema.optional(Schema.Boolean),
  tools: Schema.optional(Schema.Record(Schema.String, Schema.Boolean)).annotate({
    description:
      "@deprecated tools and permissions have been merged, you can set permissions on the session itself now",
  }),
  format: Schema.optional(SessionV1.Format),
  system: Schema.optional(Schema.String),
  variant: Schema.optional(Schema.String),
  parts: Schema.Array(
    Schema.Union([
      SessionV1.TextPartInput,
      SessionV1.FilePartInput,
      SessionV1.AgentPartInput,
      SessionV1.SubtaskPartInput,
    ]).annotate({ discriminator: "type" }),
  ),
})
export type PromptInput = Schema.Schema.Type<typeof PromptInput>

export class LoopInput extends Schema.Class<LoopInput>("SessionPrompt.LoopInput")({
  sessionID: SessionID,
}) {}

export const ShellInput = Schema.Struct({
  sessionID: SessionID,
  messageID: Schema.optional(MessageID),
  agent: Schema.String,
  model: Schema.optional(ModelRef),
  command: Schema.String,
})
export type ShellInput = Schema.Schema.Type<typeof ShellInput>

export const CommandInput = Schema.Struct({
  messageID: Schema.optional(MessageID),
  sessionID: SessionID,
  agent: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  arguments: Schema.String,
  command: Schema.String,
  variant: Schema.optional(Schema.String),
  // Inlined (no identifier annotation) to keep the original SDK output — the
  // PromptInput call site below references FilePartInput by ref via the
  // Schema export in message-v2.ts.
  parts: Schema.optional(
    Schema.Array(
      Schema.Union([
        Schema.Struct({
          id: Schema.optional(PartID),
          type: Schema.Literal("file"),
          mime: Schema.String,
          filename: Schema.optional(Schema.String),
          url: Schema.String,
          source: Schema.optional(SessionV1.FilePartSource),
        }),
      ]).annotate({ discriminator: "type" }),
    ),
  ),
})
export type CommandInput = Schema.Schema.Type<typeof CommandInput>

/** @internal Exported for testing */
export function createStructuredOutputTool(input: {
  schema: Record<string, any>
  onSuccess: (output: unknown) => void
}): AITool {
  // Remove $schema property if present (not needed for tool input)
  const { $schema: _, ...toolSchema } = input.schema

  return tool({
    description: STRUCTURED_OUTPUT_DESCRIPTION,
    inputSchema: jsonSchema(toolSchema as JSONSchema7),
    async execute(args) {
      // AI SDK validates args against inputSchema before calling execute()
      input.onSuccess(args)
      return {
        output: "Structured output captured successfully.",
        title: "Structured Output",
        metadata: { valid: true },
      }
    },
    toModelOutput({ output }) {
      return {
        type: "text",
        value: output.output,
      }
    },
  })
}
const bashRegex = /!`([^`]+)`/g
// Match [Image N] as single token, quoted strings, or non-space sequences
const argsRegex = /(?:\[Image\s+\d+\]|"[^"]*"|'[^']*'|[^\s"']+)/gi
const placeholderRegex = /\$(\d+)/g
const quoteTrimRegex = /^["']|["']$/g

export * as SessionPrompt from "./prompt"
