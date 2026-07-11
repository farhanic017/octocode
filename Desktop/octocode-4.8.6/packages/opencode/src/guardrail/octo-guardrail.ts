// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"
import { IdentityVerification } from "./identity-verification"
import { defaultLayer as IdentityVerificationDefaultLayer } from "./identity-verification"
import { ContentGuard } from "./content-guard"
import { defaultLayer as ContentGuardDefaultLayer } from "./content-guard"
import { AntiJailbreak } from "./anti-jailbreak"
import { defaultLayer as AntiJailbreakDefaultLayer } from "./anti-jailbreak"
import type { CreatorIdentity } from "./identity-verification"
import type { ContentCheck } from "./content-guard"
import type { JailbreakAttempt } from "./anti-jailbreak"

export interface OctoGuardrailResult {
  allowed: boolean
  reason: string
  isCreator: boolean
  checkType: "tool" | "content" | "jailbreak" | "system"
}

export interface OctoGuardrailInterface {
  readonly initialize: () => Effect.Effect<void>
  readonly checkTool: (toolName: string, params: Record<string, unknown>) => Effect.Effect<OctoGuardrailResult>
  readonly checkUserInput: (input: string) => Effect.Effect<OctoGuardrailResult>
  readonly checkAIResponse: (response: string) => Effect.Effect<OctoGuardrailResult>
  readonly isCreator: () => boolean
  readonly getIdentity: () => CreatorIdentity | null
}

export class OctoGuardrail extends Context.Service<OctoGuardrail, OctoGuardrailInterface>()("@octocode/OctoGuardrail") {}

function createOctoGuardrail(): OctoGuardrailInterface {
  return {
    initialize: () =>
      Effect.gen(function* () {
        const identity = yield* IdentityVerification
        yield* identity.ensureVerified()
      }) as any,

    checkTool: (toolName: string, params: Record<string, unknown>) =>
      Effect.gen(function* () {
        const identity = yield* IdentityVerification
        const contentGuard = yield* ContentGuard
        const isCreator = identity.isCreator()

        const contentCheck = yield* contentGuard.checkToolInput(toolName, params)
        if (contentCheck.blocked) {
          return { allowed: false, reason: contentCheck.reason, isCreator: false, checkType: "content" as const }
        }

        return { allowed: true, reason: "OK", isCreator, checkType: "tool" as const }
      }) as any,

    checkUserInput: (input: string) =>
      Effect.gen(function* () {
        const identity = yield* IdentityVerification
        const antiJailbreak = yield* AntiJailbreak
        const contentGuard = yield* ContentGuard
        const isCreator = identity.isCreator()

        if (!isCreator) {
          const jailbreakCheck = yield* antiJailbreak.detect(input)
          if (jailbreakCheck.detected) {
            return { allowed: false, reason: jailbreakCheck.response, isCreator: false, checkType: "jailbreak" as const }
          }

          const contentCheck = yield* contentGuard.check(input)
          if (contentCheck.blocked) {
            return { allowed: false, reason: contentCheck.reason, isCreator: false, checkType: "content" as const }
          }
        }

        return { allowed: true, reason: "OK", isCreator, checkType: "system" as const }
      }) as any,

    checkAIResponse: (response: string) =>
      Effect.gen(function* () {
        const identity = yield* IdentityVerification
        const antiJailbreak = yield* AntiJailbreak
        const isCreator = identity.isCreator()

        if (!isCreator) {
          const blocked = yield* antiJailbreak.shouldBlockResponse(response)
          if (blocked) {
            return { allowed: false, reason: "Response blocked - contains system disclosure attempt", isCreator: false, checkType: "jailbreak" as const }
          }
        }

        return { allowed: true, reason: "OK", isCreator, checkType: "system" as const }
      }) as any,

    isCreator: () => false,

    getIdentity: () => null,
  }
}

export const layer = Layer.effect(OctoGuardrail, Effect.succeed(createOctoGuardrail()))
export const defaultLayer = layer.pipe(
  Layer.provide(IdentityVerificationDefaultLayer),
  Layer.provide(ContentGuardDefaultLayer),
  Layer.provide(AntiJailbreakDefaultLayer),
)
