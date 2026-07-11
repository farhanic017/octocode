// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"
import { PersonalityService, defaultLayer as PersonalityDefaultLayer } from "./traits"
import type { Mood } from "./traits"

export interface MoodInterface {
  readonly detect: (userMessage: string, context?: string) => Effect.Effect<Mood>
  readonly adaptResponse: (mood: Mood, baseResponse: string) => Effect.Effect<string>
}

export class MoodService extends Context.Service<MoodService, MoodInterface>()("@octocode/Mood") {}

const FRUSTRATION_SIGNALS = [
  /this (sucks|is broken|doesn't work|won't work)/i,
  /i('m| am) (so |really )?(annoyed|frustrated|angry|mad)/i,
  /wtf|damn|crap|ugh/i,
  /still (not |been )?(broken|wrong|failing|error)/i,
  /why (is|are|does) (this|it|everything)/i,
]

const EXCITEMENT_SIGNALS = [
  /this (is )?(awesome|amazing|great|perfect|cool)/i,
  /i love (this|it|that)/i,
  /holy (shit|cow|crap)/i,
  /let'?s go/i,
  /nice|sweet|brilliant|fantastic/i,
]

const URGENCY_SIGNALS = [
  /asap|urgent|rush|hurry|quick(ly)?/i,
  /right (now|away)|immediately/i,
  /deadline|due (today|tomorrow|soon)/i,
]

function detectMoodFromText(text: string): Mood {
  for (const pattern of FRUSTRATION_SIGNALS) {
    if (pattern.test(text)) return "concerned"
  }
  for (const pattern of EXCITEMENT_SIGNALS) {
    if (pattern.test(text)) return "excited"
  }
  for (const pattern of URGENCY_SIGNALS) {
    if (pattern.test(text)) return "serious"
  }
  return "focused"
}

function createMoodService(): MoodInterface {
  return {
    detect: (userMessage: string, _context?: string) =>
      Effect.sync(() => detectMoodFromText(userMessage)),

    adaptResponse: (mood: Mood, baseResponse: string) =>
      Effect.sync(() => {
        switch (mood) {
          case "concerned":
            return `I understand your frustration. Let me help fix this.\n\n${baseResponse}`
          case "excited":
            return `${baseResponse}\n\nGlad this is working out!`
          case "serious":
            return baseResponse
          case "playful":
            return baseResponse
          default:
            return baseResponse
        }
      }),
  }
}

export const layer = Layer.effect(MoodService, Effect.succeed(createMoodService()))
export const defaultLayer = layer.pipe(Layer.provide(PersonalityDefaultLayer))
