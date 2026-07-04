import { Effect, Context, Layer, Schema } from "effect"

const VISION_DETAIL_AREAS = [
  "objects, people, characters, products, and text",
  "layout, spacing, alignment, hierarchy, and composition",
  "colors, materials, lighting, shadows, camera angle, and style",
  "UI states, controls, navigation, responsiveness, and accessibility hints",
  "animation timing, motion paths, transitions, cuts, and scene changes",
  "risks, ambiguities, edge cases, and what must be verified by the next agent",
] as const

export const VisionPlan = Schema.Struct({
  agentName: Schema.String,
  agentModel: Schema.String,
  task: Schema.String,
  route: Schema.Literals([
    "use_agent_native_vision",
    "delegate_to_temporary_vision_model",
    "ask_user_visual_questions",
    "continue_without_annoying_user",
  ]),
  questions: Schema.Array(Schema.String),
  detailAreas: Schema.Array(Schema.String),
  handoffPolicy: Schema.String,
})
export type VisionPlan = Schema.Schema.Type<typeof VisionPlan>

export interface Interface {
  readonly planTemporaryVision: (input: {
    agentName: string
    agentModel: string
    task: string
    mode?: string
  }) => Effect.Effect<VisionPlan>
  readonly isVisionModel: (modelId: string) => Effect.Effect<boolean>
  readonly needsVisualDetail: (task: string) => Effect.Effect<boolean>
  readonly formatVisionBrief: (plan: VisionPlan) => Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@octocode/SwarmVision") {}

export const layer = Layer.succeed(Service, {
  planTemporaryVision: (input) =>
    Effect.sync(() => {
      const agentHasVision = isVisionModelSync(input.agentModel)
      const needsDetail = needsVisualDetailSync(input.task)
      const isPlanMode = (input.mode ?? "").toLowerCase() === "plan"

      let route: VisionPlan["route"]
      let questions: string[] = []

      if (agentHasVision) {
        route = "use_agent_native_vision"
      } else if (isPlanMode && needsDetail) {
        route = "ask_user_visual_questions"
        questions = buildPlanModeVisualQuestions(input.task)
      } else {
        route = "continue_without_annoying_user"
      }

      return {
        agentName: input.agentName,
        agentModel: input.agentModel,
        task: input.task,
        route,
        questions,
        detailAreas: [...VISION_DETAIL_AREAS],
        handoffPolicy:
          "Vision model returns a full structured visual brief once; the requesting agent continues from that brief without repeatedly rereading the media.",
      }
    }),

  isVisionModel: (modelId) => Effect.succeed(isVisionModelSync(modelId)),

  needsVisualDetail: (task) => Effect.succeed(needsVisualDetailSync(task)),

  formatVisionBrief: (plan) =>
    Effect.sync(() => {
      if (plan.route === "use_agent_native_vision") {
        return [
          `<vision_routing agent="${plan.agentName}" route="native_vision" />`,
          "This agent has native vision capabilities. Inspect visual assets directly.",
        ].join("\n")
      }

      if (plan.route === "ask_user_visual_questions") {
        const questionList = plan.questions.map((q, i) => `  ${i + 1}. ${q}`).join("\n")
        return [
          `<vision_routing agent="${plan.agentName}" route="ask_user" />`,
          "No vision model available. Ask the user these visual questions before proceeding:",
          questionList,
        ].join("\n")
      }

      return [
        `<vision_routing agent="${plan.agentName}" route="skip" />`,
        "No vision model available and task does not require visual inspection. Proceed with reasonable assumptions.",
      ].join("\n")
    }),
})

function isVisionModelSync(model: string): boolean {
  const lower = model.toLowerCase()
  return /vision|multimodal|gpt-4o|gemini|claude|image|video|scout|flash/.test(lower)
}

function needsVisualDetailSync(task: string): boolean {
  const lower = task.toLowerCase()
  return /image|video|design|layout|animation|visual|photo|screenshot|figma|ui|ux|css|style/.test(lower)
}

function isSimpleVisualTask(task: string): boolean {
  const lower = task.toLowerCase()
  const simple = /simple|basic|quick|plain/.test(lower)
  const complex = /full app|dashboard|animation|exact|detailed|responsive/.test(lower)
  return simple && !complex
}

function buildPlanModeVisualQuestions(task: string): string[] {
  if (isSimpleVisualTask(task)) return []
  return [
    "What exact visual style should the final result follow?",
    "What are the main objects, layout, proportions, colors, and materials?",
    "What text, branding, icons, UI controls, or labels must be preserved?",
    "What animations, transitions, timing, or interactions are required?",
    "What functions or user flows are tied to the visual design?",
    "What details are forbidden, optional, or lower priority?",
  ]
}

export * as SwarmVision from "./vision"
