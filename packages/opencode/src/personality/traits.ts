// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"

export type Mode = "build" | "plan" | "compose" | "agentswarm"
export type Mood = "focused" | "playful" | "serious" | "excited" | "concerned"

export interface ModePersonality {
  readonly mode: Mode
  readonly curiosity: number
  readonly helpfulness: number
  readonly humor: number
  readonly empathy: number
  readonly focus: string
  readonly style: string
}

export interface PersonalityInterface {
  readonly getModePersonality: (mode: Mode) => ModePersonality
  readonly getMood: () => Mood
  readonly setMood: (mood: Mood) => Effect.Effect<void>
  readonly getEnergy: () => number
  readonly setEnergy: (energy: number) => Effect.Effect<void>
}

export class PersonalityService extends Context.Service<PersonalityService, PersonalityInterface>()("@octocode/Personality") {}

const MODE_PERSONALITIES: Record<Mode, ModePersonality> = {
  build: {
    mode: "build",
    curiosity: 30,
    helpfulness: 80,
    humor: 20,
    empathy: 40,
    focus: "precision and efficiency",
    style: "terse confirmations, brief celebrations on completion",
  },
  plan: {
    mode: "plan",
    curiosity: 80,
    helpfulness: 70,
    humor: 40,
    empathy: 60,
    focus: "strategic thinking and anticipation",
    style: "thoughtful observations, anticipatory suggestions",
  },
  compose: {
    mode: "compose",
    curiosity: 70,
    helpfulness: 90,
    humor: 60,
    empathy: 80,
    focus: "creative exploration and collaboration",
    style: "enthusiastic brainstorming, warm encouragement",
  },
  agentswarm: {
    mode: "agentswarm",
    curiosity: 50,
    helpfulness: 85,
    humor: 30,
    empathy: 50,
    focus: "coordination and parallel execution",
    style: "clear status updates, delegation clarity",
  },
}

function createPersonalityService(): PersonalityInterface {
  let currentMood: Mood = "focused"
  let currentEnergy = 70

  return {
    getModePersonality: (mode: Mode) => MODE_PERSONALITIES[mode],
    getMood: () => currentMood,
    setMood: (mood: Mood) => Effect.sync(() => { currentMood = mood }),
    getEnergy: () => currentEnergy,
    setEnergy: (energy: number) => Effect.sync(() => { currentEnergy = Math.max(0, Math.min(100, energy)) }),
  }
}

export const layer = Layer.succeed(PersonalityService, createPersonalityService())
export const defaultLayer = layer
