import { Effect, Schema } from "effect"

export interface ToolResult {
  title: string
  metadata?: Record<string, unknown>
  output: string
  attachments?: Array<{
    type: "image"
    data: string
    mimeType: string
  }>
}

export interface ToolContext {
  ask: (permission: {
    permission: string
    patterns: string[]
    always: string[]
    metadata?: Record<string, unknown>
  }) => Effect.Effect<void>
}

export interface ToolDef {
  description: string
  parameters: Schema.Schema<any>
  execute: (params: any, ctx: ToolContext) => Effect.Effect<ToolResult>
}

export function define(name: string, effect: Effect.Effect<ToolDef>): { name: string; effect: Effect.Effect<ToolDef> } {
  return { name, effect }
}
