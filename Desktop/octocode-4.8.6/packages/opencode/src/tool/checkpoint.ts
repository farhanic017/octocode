import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"

const Parameters = z.object({
  operation: z.enum(["create", "rollback", "list", "get", "delete"]),
  checkpoint_id: z.string().optional().describe("Checkpoint ID for rollback/get/delete"),
  description: z.string().optional().describe("Description for new checkpoint"),
  session_id: z.string().optional().describe("Session ID to filter checkpoints"),
  working_dir: z.string().optional().describe("Working directory (defaults to cwd)"),
  files: z.string().optional().describe("Comma-separated files to checkpoint (default: all modified)"),
  limit: z.number().optional().describe("Max checkpoints to list (default 10)"),
})

export const CheckpointTool = Tool.define(
  "checkpoint",
  Effect.gen(function* () {
    const mod = yield* Effect.promise(() => import("../memory/checkpoint"))
    return {
      description: `Checkpoint system: snapshots working directory before file changes, with rollback support.
- create: Save snapshot of modified files before changes
- rollback: Revert files to a previous checkpoint
- list: Show available checkpoints
- get: View details of a specific checkpoint
- delete: Remove a checkpoint`,

      parameters: Parameters,

      execute: (params: z.infer<typeof Parameters>) =>
        Effect.gen(function* () {
          const cwd = params.working_dir || process.cwd()

          switch (params.operation) {
            case "create": {
              const files = params.files ? params.files.split(",").map((f) => f.trim()) : undefined
              const cp = yield* Effect.promise(() =>
                mod.createCheckpoint(
                  params.session_id || "manual",
                  params.description || `Checkpoint at ${new Date().toLocaleString()}`,
                  cwd,
                  files,
                ),
              )
              return {
                output: `Checkpoint ${cp.id}: ${cp.files.length} files saved${cp.gitCommit ? ` (git: ${cp.gitCommit.slice(0, 8)})` : ""}`,
                title: "Checkpoint Created",
                metadata: { id: cp.id, files: cp.files.length },
              }
            }

            case "rollback": {
              if (!params.checkpoint_id) return { output: "Error: checkpoint_id required", title: "Checkpoint", metadata: {} }
              const result = yield* Effect.promise(() => mod.rollback(params.checkpoint_id!, cwd))
              return {
                output: `Rollback: ${result.restored} files restored${result.errors.length > 0 ? ` (${result.errors.length} errors)` : ""}`,
                title: "Rollback Complete",
                metadata: { restored: result.restored, errors: result.errors.length },
              }
            }

            case "list": {
              const cps = mod.listCheckpoints(params.session_id, params.limit || 10)
              if (cps.length === 0) return { output: "No checkpoints found.", title: "Checkpoints", metadata: {} }
              const output = cps.map((cp) => `  ${cp.id} — ${cp.description} (${cp.files.length} files)`).join("\n")
              return { output: `Checkpoints:\n${output}`, title: `Checkpoints (${cps.length})`, metadata: {} }
            }

            case "get": {
              if (!params.checkpoint_id) return { output: "Error: checkpoint_id required", title: "Checkpoint", metadata: {} }
              const cp = mod.getCheckpoint(params.checkpoint_id)
              if (!cp) return { output: `Checkpoint ${params.checkpoint_id} not found`, title: "Checkpoint", metadata: {} }
              return {
                output: `${cp.id}: ${cp.description}\n  Files: ${cp.files.join(", ")}\n  Created: ${new Date(cp.timestamp).toLocaleString()}`,
                title: "Checkpoint Details",
                metadata: cp,
              }
            }

            case "delete": {
              if (!params.checkpoint_id) return { output: "Error: checkpoint_id required", title: "Checkpoint", metadata: {} }
              mod.deleteCheckpoint(params.checkpoint_id)
              return { output: `Deleted checkpoint ${params.checkpoint_id}`, title: "Checkpoint", metadata: {} }
            }

            default:
              return { output: "Unknown operation", title: "Checkpoint", metadata: {} }
          }
        }).pipe(Effect.orDie),
    }
  }) as any,
)
