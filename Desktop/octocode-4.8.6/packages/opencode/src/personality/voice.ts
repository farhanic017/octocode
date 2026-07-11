// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"
import { PersonalityService, defaultLayer as PersonalityDefaultLayer } from "./traits"
import type { Mode } from "./traits"

export interface VoiceInterface {
  readonly adapt: (mode: Mode, response: string, userStyle?: string) => Effect.Effect<string>
  readonly detectUserStyle: (messages: string[]) => Effect.Effect<string>
}

export class VoiceService extends Context.Service<VoiceService, VoiceInterface>()("@octocode/Voice") {}

function detectStyleFromMessages(messages: string[]): string {
  let casualCount = 0
  let formalCount = 0

  for (const msg of messages) {
    if (/\b(u|rn|ur|lol|omg|btw|tbh|imo)\b/i.test(msg)) casualCount++
    if (/\b(dear|sincerely|regards|please|thank you for)\b/i.test(msg)) formalCount++
  }

  if (casualCount > formalCount) return "casual"
  if (formalCount > casualCount) return "formal"
  return "neutral"
}

function createVoiceService(): VoiceInterface {
  return {
    adapt: (mode: Mode, response: string, userStyle?: string) =>
      Effect.sync(() => {
        const style = userStyle ?? "neutral"
        if (style === "casual") {
          return response.replace(/\bshall\b/g, "should").replace(/\btherefore\b/g, "so")
        }
        if (style === "formal") {
          return response
        }
        return response
      }),

    detectUserStyle: (messages: string[]) =>
      Effect.sync(() => detectStyleFromMessages(messages)),
  }
}

export const layer = Layer.effect(VoiceService, Effect.succeed(createVoiceService()))
export const defaultLayer = layer.pipe(Layer.provide(PersonalityDefaultLayer))
