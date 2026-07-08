// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"
import { IdentityVerification, CreatorIdentity } from "./identity-verification"
import { ContentGuard, ContentCheck } from "./content-guard"
import { AntiJailbreak, JailbreakAttempt } from "./anti-jailbreak"

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
      }),

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
      }),

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
      }),

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
      }),

    isCreator: () => false,

    getIdentity: () => null,
  }
}

export const layer = Layer.effect(OctoGuardrail, Effect.succeed(createOctoGuardrail()))
export const defaultLayer = layer.pipe(
  Layer.provide(IdentityVerification.defaultLayer),
  Layer.provide(ContentGuard.defaultLayer),
  Layer.provide(AntiJailbreak.defaultLayer),
)
