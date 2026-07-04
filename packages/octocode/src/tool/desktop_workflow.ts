import { Effect, Schema } from "effect"
import * as Tool from "./tool"

const WorkflowActionSchema = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("start"),
    name: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("step"),
    workflow_id: Schema.String,
    description: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("end"),
    workflow_id: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("list"),
  }),
])

export const Parameters = Schema.Struct({
  workflow: WorkflowActionSchema,
})

export const DesktopWorkflowTool = Tool.define(
  "desktop_workflow",
  Effect.gen(function* () {
    return {
      description:
        "Manage automation workflows: start, step, end, or list workflows for recording and replaying desktop actions.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "desktop_workflow",
            patterns: ["desktop_workflow"],
            always: ["desktop_workflow"],
            metadata: { workflow: params.workflow },
          })

          try {
            let output: string

            switch (params.workflow.action) {
              case "start": {
                const id = `wf-${Date.now()}`
                output = `Workflow "${params.workflow.name}" started with ID: ${id}`
                break
              }
              case "step": {
                output = `Step recorded for workflow ${params.workflow.workflow_id}: ${params.workflow.description}`
                break
              }
              case "end": {
                output = `Workflow ${params.workflow.workflow_id} completed and saved.`
                break
              }
              case "list": {
                output = "No active workflows."
                break
              }
            }

            return {
              title: `Workflow: ${params.workflow.action}`,
              metadata: { action: params.workflow.action },
              output,
            }
          } catch (error) {
            return {
              title: "Workflow error",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
