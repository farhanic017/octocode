import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@octocode-ai/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~octocode/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~octocode/WorkspaceRef", {
  defaultValue: () => undefined,
})
