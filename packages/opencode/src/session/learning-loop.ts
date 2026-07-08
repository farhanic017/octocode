import { Log } from "@/util"
import { LessonLearner, type Lesson } from "@/swarm/learning"
import { crystallizeSkill } from "@/skill/crystallizer"

const log = Log.create({ service: "learning-loop" })

const TOOL_CALL_THRESHOLD = 3

let initialized = false
let learner: LessonLearner | undefined

function ensureInitialized() {
  if (initialized) return
  initialized = true

  try {
    learner = new LessonLearner()
    log.info("learning loop initialized")
  } catch (e) {
    log.error("failed to initialize learning loop", { error: e })
  }
}

export interface Interface {
  readonly learnFromSession: (sessionID: string, sdk: any) => Promise<Lesson | undefined>
  readonly getStats: () => Promise<{ total: number; byAgent: Record<string, number>; successRate: number }>
}

export const LearningLoop: Interface = {
  learnFromSession: async (sessionID: string, sdk: any) => {
    ensureInitialized()
    if (!learner) return undefined

    try {
      const allMessages = await sdk.client.session.messages({
        sessionID,
        limit: 1000,
        agent_id: "*",
      })

      if (!allMessages || allMessages.length === 0) return undefined

      const userMessages = allMessages.filter((m: any) => m.role === "user")
      const assistantMessages = allMessages.filter((m: any) => m.role === "assistant")

      if (userMessages.length === 0) return undefined

      const firstUserMsg = userMessages[0]
      const taskDescription = (firstUserMsg.content || "")
        .slice(0, 200)

      let toolCallCount = 0
      let toolNames: string[] = []
      let hasError = false
      let filesChanged: string[] = []

      for (const msg of assistantMessages) {
        if (msg.parts) {
          for (const part of msg.parts) {
            if (part.type === "tool") {
              toolCallCount++
              if (part.toolName) toolNames.push(part.toolName)
            }
            if (part.type === "patch") {
              if (part.files) filesChanged.push(...part.files)
            }
          }
        }
        if (msg.error) hasError = true
      }

      const success = !hasError

      const context = `Task: ${taskDescription}\nTools used: ${toolNames.join(", ") || "none"}\nFiles changed: ${filesChanged.length}`
      const outcome = success ? `Completed successfully with ${toolCallCount} tool calls` : `Failed or was aborted`
      const lesson = success
        ? `Successfully completed: ${taskDescription.slice(0, 100)} using ${toolNames.join(", ") || "direct approach"}`
        : `Failed to complete: ${taskDescription.slice(0, 100)}`

      const tags = ["auto-learned", ...new Set(toolNames)]

      const logged = learner.logLesson(
        "build",
        context,
        outcome,
        lesson,
        tags,
        success,
      )

      log.info("lesson logged", {
        sessionID,
        success,
        toolCallCount,
        filesChanged: filesChanged.length,
      })

      if (success && toolCallCount >= TOOL_CALL_THRESHOLD) {
        crystallizeSkill({
          taskDescription,
          toolNames,
          filesChanged,
          messages: assistantMessages.map((m: any) => ({
            role: m.role,
            content: (m.content || "").slice(0, 500),
          })),
        }).catch((err: any) => log.error("skill crystallization failed", { error: err }))
      }

      return logged
    } catch (e) {
      log.error("learnFromSession failed", { error: e })
      return undefined
    }
  },

  getStats: async () => {
    ensureInitialized()
    if (!learner) return { total: 0, byAgent: {}, successRate: 0 }
    return learner.getStats()
  },
}
