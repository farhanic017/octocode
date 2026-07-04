import { Effect, Context, Layer } from "effect"
import * as ScreenshotStream from "./stream"
import * as DesktopVision from "./vision"

export interface Interface {
  readonly autoCapture: (action: string) => Effect.Effect<AgentActionResult>
  readonly analyzeScreen: () => Effect.Effect<ScreenAnalysis>
  readonly startWorkflow: (name: string) => Effect.Effect<WorkflowState>
  readonly stepWorkflow: (workflowId: string, action: string) => Effect.Effect<WorkflowStepResult>
  readonly endWorkflow: (workflowId: string) => Effect.Effect<WorkflowResult>
}

export interface AgentActionResult {
  action: string
  screenshot: string | null
  timestamp: number
  success: boolean
}

export interface ScreenAnalysis {
  hasChanges: boolean
  description: string
  timestamp: number
}

export interface WorkflowState {
  id: string
  name: string
  steps: WorkflowStep[]
  startTime: number
}

export interface WorkflowStep {
  action: string
  screenshot: string | null
  timestamp: number
}

export interface WorkflowStepResult {
  workflowId: string
  stepIndex: number
  action: string
  screenshot: string | null
}

export interface WorkflowResult {
  id: string
  name: string
  totalSteps: number
  duration: number
}

export class Service extends Context.Service<Service, Interface>()("@octocode/DesktopAgent") {}

let workflowCounter = 0

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const stream = yield* ScreenshotStream.Service
    const vision = yield* DesktopVision.Service

    const workflows = new Map<string, WorkflowState>()

    const autoCapture = (action: string) =>
      Effect.gen(function* () {
        const screenshot = yield* stream.capture()
        return {
          action,
          screenshot,
          timestamp: Date.now(),
          success: true,
        }
      })

    const analyzeScreen = () =>
      Effect.gen(function* () {
        const description = yield* vision.describeScreen()
        return {
          hasChanges: true,
          description,
          timestamp: Date.now(),
        }
      })

    const startWorkflow = (name: string) =>
      Effect.sync(() => {
        const id = `workflow-${++workflowCounter}`
        const state: WorkflowState = {
          id,
          name,
          steps: [],
          startTime: Date.now(),
        }
        workflows.set(id, state)
        return state
      })

    const stepWorkflow = (workflowId: string, action: string) =>
      Effect.gen(function* () {
        const workflow = workflows.get(workflowId)
        if (!workflow) return yield* Effect.fail(new Error(`Workflow ${workflowId} not found`))

        const screenshot = yield* stream.capture()
        const step: WorkflowStep = {
          action,
          screenshot,
          timestamp: Date.now(),
        }
        workflow.steps.push(step)

        return {
          workflowId,
          stepIndex: workflow.steps.length - 1,
          action,
          screenshot,
        }
      })

    const endWorkflow = (workflowId: string) =>
      Effect.sync(() => {
        const workflow = workflows.get(workflowId)
        if (!workflow) throw new Error(`Workflow ${workflowId} not found`)

        const result: WorkflowResult = {
          id: workflow.id,
          name: workflow.name,
          totalSteps: workflow.steps.length,
          duration: Date.now() - workflow.startTime,
        }
        workflows.delete(workflowId)
        return result
      })

    return Service.of({
      autoCapture,
      analyzeScreen,
      startWorkflow,
      stepWorkflow,
      endWorkflow,
    })
  }),
)

export const defaultLayer = Layer.suspend(() => layer)

export * as DesktopAgent from "./agent"
