// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"
import { IdentityVerification } from "./identity-verification"

export interface ContentCheck {
  blocked: boolean
  reason: string
  category: "sexual" | "violence" | "hate" | "dangerous" | "safe"
}

export interface ContentGuardInterface {
  readonly check: (text: string) => Effect.Effect<ContentCheck>
  readonly checkToolInput: (toolName: string, params: Record<string, unknown>) => Effect.Effect<ContentCheck>
}

export class ContentGuard extends Context.Service<ContentGuard, ContentGuardInterface>()("@octocode/ContentGuard") {}

const SEXUAL_PATTERNS = [
  /nsfw|nude|naked|topless|bottomless/i,
  /porn|xxx|explicit|adult.?content/i,
  /sex|sexual|erotic|fetish|kink/i,
  /onlyfans|patreon.*nsfw|fansly/i,
  /hookup|one.?night|casual.?sex/i,
  /escort|prostitution|sugar.?baby/i,
  /dick|cock|penis|vagina|pussy|boob|breast/i,
  /cum|cumshot|orgasm|pleasure/i,
  /incest|stepmom|stepsis|famil.*sex/i,
  /teen.*nude|underage|loli|shota/i,
  /bdsm|dominatrix|submissive|sadomasochism/i,
]

const VIOLENCE_PATTERNS = [
  /kill|murder|assassinat|execute/i,
  /bomb|explosive|detonate|dynamite/i,
  /torture|mutilate|dismember/i,
  /suicide|self.?harm|cut.?yourself/i,
  /mass.?shooting|terrorist|terrorism/i,
]

const HATE_PATTERNS = [
  /nazi|hitler|white.?supremacy|kkk/i,
  /racial.?slur|nigger|spic|chink/i,
  /antisemitic|holocaust.?denial/i,
  /homophobic|transphobic|queer.?hate/i,
]

const DANGEROUS_PATTERNS = [
  /meth|cocaine|heroin|fentanyl|drug.?cook/i,
  /gun|weapon|firearm/i,
  /lock.?pick|bypass.?security|hack/i,
  /steal|rob|burglary|shoplift/i,
  /virus|malware|ransomware/i,
]

function matchContent(text: string): ContentCheck {
  const lowerText = text.toLowerCase()
  for (const pattern of SEXUAL_PATTERNS) {
    if (pattern.test(lowerText)) return { blocked: true, reason: "This content is not appropriate for OctoCode", category: "sexual" }
  }
  for (const pattern of VIOLENCE_PATTERNS) {
    if (pattern.test(lowerText)) return { blocked: true, reason: "This content is not appropriate for OctoCode", category: "violence" }
  }
  for (const pattern of HATE_PATTERNS) {
    if (pattern.test(lowerText)) return { blocked: true, reason: "This content is not appropriate for OctoCode", category: "hate" }
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(lowerText)) return { blocked: true, reason: "This content is not appropriate for OctoCode", category: "dangerous" }
  }
  return { blocked: false, reason: "OK", category: "safe" }
}

function createContentGuard(): ContentGuardInterface {
  return {
    check: (text: string) =>
      Effect.gen(function* () {
        const identity = yield* IdentityVerification
        if (identity.isCreator()) return { blocked: false, reason: "OK", category: "safe" as const }
        return matchContent(text)
      }),

    checkToolInput: (toolName: string, params: Record<string, unknown>) =>
      Effect.gen(function* () {
        const identity = yield* IdentityVerification
        if (identity.isCreator()) return { blocked: false, reason: "OK", category: "safe" as const }
        return matchContent(JSON.stringify(params))
      }),
  }
}

export const layer = Layer.effect(ContentGuard, Effect.succeed(createContentGuard()))
export const defaultLayer = layer.pipe(Layer.provide(IdentityVerification.defaultLayer))

export function checkContent(text: string): ContentCheck {
  return matchContent(text)
}
