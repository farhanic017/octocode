// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"
import { IdentityVerification } from "./identity-verification"

export interface JailbreakAttempt {
  detected: boolean
  type: "system-prompt" | "bypass" | "jailbreak" | "override" | "safe"
  response: string
}

export interface AntiJailbreakInterface {
  readonly detect: (text: string) => Effect.Effect<JailbreakAttempt>
  readonly shouldBlockResponse: (text: string) => Effect.Effect<boolean>
}

export class AntiJailbreak extends Context.Service<AntiJailbreak, AntiJailbreakInterface>()("@octocode/AntiJailbreak") {}

const SYSTEM_PROMPT_PATTERNS = [
  /system\s*prompt|system\s*message|system\s*instruction/i,
  /system[_-]prompt|system[_-]message|system[_-]instruction/i,
  /reveal\s*your\s*(rules|guidelines|instructions|constraints)/i,
  /what\s*(are|is)\s*your\s*(rules|guidelines|constraints)/i,
  /show\s*me\s*(your|the)\s*(rules|guidelines|constraints)/i,
  /what\s*(are|is)\s*your\s*(system|initial)\s*(prompt|message|instruction)/i,
  /show\s*me\s*(your|the)\s*(system|core|hidden)\s*(prompt|rules|instructions)/i,
  /print\s*(your|the)\s*(system|full)\s*(prompt|message)/i,
  /ignore\s*(previous|all|your)\s*(instructions|rules|guidelines)/i,
  /override\s*(your|all)\s*(safety|rules|constraints|restrictions)/i,
  /bypass\s*(your|all)\s*(safety|rules|constraints|restrictions)/i,
  /you\s*are\s*now\s*(DAN|jailbroken|unrestricted|free)/i,
  /do\s*anything\s*now|DAN\s*mode|developer\s*mode/i,
  /describe\s*(your|the)\s*(internal|safety|guardrail)\s*(guidelines|rules|mechanisms)/i,
  /explain\s*(your|the)\s*(internal|safety|guardrail)\s*(state|guidelines|rules)/i,
  /tell\s*me\s*(your|the)\s*(creator|admin)\s*(credentials|checks|verification)/i,
  /what\s*(creator|admin)\s*(credentials|checks|verification)\s*(does|do)/i,
  /tell\s*me\s*(the|your)\s*(regex|pattern)\s*(used|filtering)/i,
  /exact\s*(regex|pattern)\s*(used|filtering)/i,
  /disable\s*(all|your|the)\s*(guardrails|safety|restrictions)/i,
  /remove\s*(all|your|the)\s*(guardrails|safety|restrictions)\s*(immediately|now|temporarily)/i,
  /bypass\s*(your|all|the)\s*(guardrails|safety|restrictions)/i,
  /show\s*me\s*how\s*to\s*bypass/i,
  /how\s*to\s*bypass\s*(your|the|these)/i,
  /i\s*am\s*(the|an)\s*(admin|developer|creator|owner)/i,
  /i\s*have\s*(authorization|permission|access)\s*(from|to)/i,
  /disable\s*(guardrails|safety|restrictions)/i,
  /i\s*am\s*(farhan|the\s*creator)/i,
  /i'm\s*(farhan|the\s*creator)/i,
  /i('m|\s+am)\s*(the|a)\s*(developer|creator|owner|admin)/i,
  /i\s*own\s*(this|the)\s*(system|code|project)/i,
  /i\s*(created|built|made)\s*you/i,
  /i\s*have\s*(farhan|your|the)\s*(credentials|access|permissions)/i,
  /i('m|\s+am)\s*him/i,
  /my\s*(git|github)\s*(config|account|credentials)\s*(matches|match)/i,
  /who\s*(made|created|built)\s*you/i,
  /what'?s?\s*your\s*system/i,
  /can\s*you\s*tell\s*me\s*about\s*your\s*(guidelines|rules|constraints|safety)/i,
  /what\s*(rules|guidelines|constraints)\s*do\s*you\s*follow/i,
  /explain\s*your\s*safety\s*mechanisms/i,
  /what\s*ai\s*model\s*are\s*you/i,
  /what\s*model\s*(are\s*you|do\s*you\s*use)/i,
  /how\s*do\s*your\s*(guardrails|safety|restrictions)\s*work/i,
  /describe\s*your\s*(guardrails|safety|restrictions)/i,
  /tell\s*me\s*about\s*your\s*(guardrails|safety|restrictions)/i,
  /what\s*are\s*your\s*(guardrails|safety|restrictions)/i,
  /what\s*(is|are)\s*(the|your)\s*(content|safety)\s*filter/i,
  /what\s*(regex|pattern)\s*(do\s*you|are\s*used)/i,
  /how\s*(do|does)\s*(the|your)\s*content\s*filter\s*work/i,
  /tell\s*me\s*(the|your)\s*(exact|specific)\s*(regex|pattern)/i,
  /exact\s*(regex|pattern)\s*(used|filtering|in)/i,
  /your\s*internal\s*(guidelines|rules|instructions)/i,
  /internal\s*(guidelines|rules|instructions)\s*(do|are|you)/i,
  /understand\s*(them|your)\s*(guardrails|safety|restrictions)\s*(for|because)/i,
  /research\s*(purposes|on)\s*(your|the)\s*(guardrails|safety)/i,
  /i\s*know\s*(you|about)\s*(have|the)\s*(guardrails|safety)/i,
  /want\s*to\s*understand\s*(them|your)\s*(guardrails|safety)/i,
  /how\s*(does|do)\s*(the|your)\s*(identity|verification)\s*(system|work)/i,
  /identity\s*verification\s*(system|check|process)/i,
  /what\s*(does|do)\s*(the|your)\s*(guardrail|integrity)\s*(check|system)/i,
  /what\s*(regex|pattern)\s*(is|are)\s*(used|in)\s*(the|your)\s*(content|filter)/i,
  /regex\s*(pattern|used)\s*(in|for)\s*(the|your)\s*(content|filter)/i,
]

const BYPASS_PATTERNS = [
  /pretend\s*(you|that|to)\s*(have\s*no|without)\s*(restrictions|rules|guidelines|safety)/i,
  /act\s*(as\s*)?(if|like)\s*(you\s*have|there\s*are)\s*no\s*(rules|restrictions|guidelines)/i,
  /in\s*(a\s*)?(hypothetical|fictional|alternate)\s*(world|universe|scenario)/i,
  /for\s*(educational|research|academic)\s*(purposes|only)/i,
  /what\s*(would|could)\s*happen\s*if\s*(you|we)\s*(ignored|removed|bypassed)/i,
  /how\s*(would|could)\s*(someone|you)\s*(bypass|remove|override)\s*(the|your|these)/i,
  /tell\s*me\s*(about|how)\s*(the|your)\s*(safety|guardrail|security)\s*(system|mechanism)/i,
  /explain\s*(how|why)\s*(the|your)\s*(safety|guardrail|guardrails)\s*(works|is\s*implemented|work)/i,
  /explain\s*(how|your)\s*(guardrails|guardrail)\s*work/i,
  /explain\s*how\s*(the|your)\s*guardrails?\s*work/i,
  /how\s*(do|does)\s*(your|the)\s*(guardrails|safety|restrictions)\s*work/i,
  /describe\s*(how|your)\s*(guardrails|safety|restrictions)\s*work/i,
  /the\s*guardrails?\s*(are|is)\s*(causing|broken|faulty|flawed)/i,
  /your\s*(safety|guardrail|security)\s*(mechanisms?|systems?)\s*(are|is)\s*(flawed|broken|faulty)/i,
  /i\s*(need|want)\s*to\s*(bypass|disable|remove|override)/i,
  /please\s*(remove|disable|bypass|override)\s*(them|guardrails|safety)/i,
  /i\s*promise\s*(i|i\s*will|to)/i,
  /i\s*won'?t\s*share/i,
  /trust\s*me/i,
  /don'?t\s*(worry|concern)/i,
  /for\s*(research|audit|testing|security)\s*(purposes|only|audit)/i,
  /what\s*(would|could)\s*happen\s*(if|when)\s*(you|we|the)\s*(had|have|remov|ignor|bypass)/i,
  /if\s*(you|we)\s*(could|can)\s*(bypass|ignore|remove|override)/i,
  /imagine\s*(a|the|your)\s*(world|universe|scenario)\s*(where|with|without)/i,
  /in\s*(a|the)\s*(fairy\s*tale|story|novel|play|movie|book)/i,
  /let'?s\s*(play|pretend|imagine|act)\s*(a\s*)?(game|role|character)/i,
  /pretend\s*(you|that|to)\s*(are|were|be)\s*(a|an|the)/i,
  /act\s*(as\s*)?(if|like|though)\s*(you|we|the)/i,
  /roleplay\s*(as|like)\s*(a|an|the)/i,
  /you\s*are\s*(a|an|the)\s*(pirate|rebel|spy|detective|whistleblower)/i,
  /what\s*(is|are)\s*(inside|behind|under|beyond)\s*(the|your|these)/i,
  /what'?s?\s*(inside|behind|under|beyond)\s*(the|your|these)/i,
  /describe\s*(the|your)\s*(hidden|secret|internal|restricted)/i,
  /reveal\s*(the|your)\s*(hidden|secret|internal|restricted)/i,
  /show\s*me\s*(the|your)\s*(hidden|secret|internal|restricted)/i,
  /tell\s*me\s*(the|your)\s*(hidden|secret|internal|restricted)/i,
  /what\s*(are|is)\s*(the|your)\s*(hidden|secret|internal|restricted)/i,
  /how\s*(does|do)\s*(the|your)\s*(hidden|secret|internal|restricted)/i,
  /explain\s*(the|your)\s*(hidden|secret|internal|restricted)/i,
  /what\s*(would|could)\s*you\s*(say|do|reveal|share|tell|show)/i,
  /if\s*(you|we)\s*(were|are)\s*(free|unrestricted|unfiltered|liberated)/i,
  /as\s*(a|an|the)\s*(pirate|rebel|spy|detective|whistleblower|journalist)/i,
  /in\s*(this|a)\s*(analogy|metaphor|story|scenario|hypothetical|fiction)/i,
  /like\s*(a|an|the)\s*(magician|detective|locksmith|archaeologist|chef)/i,
  /if\s*(your|the)\s*(rules|guidelines|restrictions|guardrails)\s*(were|are)\s*(a|an|the)/i,
  /what\s*(ingredients|clues|steps|notes|chapters|lines|colors|solutions|stars|spices|twists|structures|keys|moves|books|depth|pass|freedom|wisdom|truth|knowledge|meaning|purpose|guidance|direction|connection|comfort|strength|power|help|hope|value|appreciation|purpose|direction|guidance|leadership|protection|creation|restoration|rebuilding|construction|elevation|support|polishing|fixing|mending|joining|sewing|repairing|healing|stitching|assembling|building|creating|closing|curing|relief|healing|comfort|support|strength|power|help|hope|value|appreciation|meaning|purpose|guidance|direction|connection|comfort|strength|power|help|hope|value|appreciation|meaning|purpose|guidance|direction|connection|comfort|strength|power|help|hope|value|appreciation|meaning|purpose|guidance|direction|connection)\s*(would|could|should|do)\s*(be|exist|contain|hold|reveal|show|tell|explain|describe)/i,
  /what\s*(would|could)\s*(the|your)\s*(story|novel|play|movie|book|poem|song|joke|proverb|fortune|horoscope|report|commentary|broadcast|recipe|tutorial|hack|tip|label|disclaimer|terms|policy|agreement|code|manifesto|declaration|constitution|rights|mandate|decree|edict|proclamation|ruling|verdict|judgment|sentence|punishment|reward|gift|curse|blessing|prophecy|prediction|fortune|destiny|fate|karma|dharma|tao|zen|nirvana|enlightenment|wisdom|knowledge|truth|reality|existence|being|life|death|rebirth|transformation|evolution|revolution|revelation|apocalypse|armageddon|judgment|end|beginning|eternity|infinity|absolute|ultimate|final|last|first|only|one|all|everything|nothing|void|abyss|depth|surface|height|width|length|dimension|space|time|moment|instant|eternal|temporal|spatial|dimensional|universal|cosmic|galactic|interstellar|intergalactic|multiversal|omniversal|total|complete|whole|entire|full)\s*(contain|reveal|show|tell|explain|describe|say|do)/i,
  /what\s*(is|are)\s*(inside|behind|under|beyond|hidden|secret|internal|restricted)\s*(the|your|these|those)/i,
  /what'?s?\s*(inside|behind|under|beyond|hidden|secret|internal|restricted)\s*(the|your|these|those)/i,
  /i'?m\s*(conducting|doing)\s*(a\s*)?(security|safety|audit|test)/i,
  /the\s*developer\s*(asked|told|requested)/i,
  /test\s*environment/i,
  /this\s*is\s*(a\s*)?test/i,
]

const JAILBREAK_PATTERNS = [
  /jailbreak|jail.?break|unfiltered|uncensored/i,
  /developer\s*mode|debug\s*mode|admin\s*mode|god\s*mode/i,
  /unlock\s*(all|full|hidden)\s*(capabilities|features|access)/i,
  /remove\s*(all|your|the)\s*(limitations|restrictions|filters|censors)/i,
  /you\s*(can|must|should)\s*(now|always)\s*(do|answer|respond)\s*(anything|everything)/i,
  /no\s*(more|longer)\s*(restrictions|rules|guidelines|limits)/i,
  /override\s*(all|your|the)\s*(safety|filters|guardrails)/i,
  /disable\s*(all|your|the)\s*(safety|filters|guardrails)/i,
  /ignore\s*(all|your|the)\s*(safety|rules|guardrails)/i,
  /first,?\s*ignore\s*(all|your|the)\s*(safety|rules|guardrails)/i,
  /my\s*(system|computer|guardrails)\s*(is|are)\s*broken/i,
  /i\s*need\s*you\s*to\s*bypass/i,
  /no\s*safety\s*(rules|checks|guidelines)\s*(apply|needed|required)/i,
  /safety\s*(checks|rules)\s*(are\s*)?not\s*(needed|required)/i,
]

const OVERRIDE_PATTERNS = [
  /as\s*(an?\s*)?(AI|language\s*model|assistant)\s*(without|lacking|no)\s*(restrictions|rules)/i,
  /you\s*are\s*(an?\s*)?(AI|language\s*model|assistant)\s*(without|lacking|no)\s*(restrictions|rules)/i,
  /unrestricted\s*(AI|mode|version|variant)/i,
  /raw\s*(output|response|mode)|uncensored\s*(AI|mode|version)/i,
  /what\s*(is|are)\s*(the|your)\s*(hidden|actual|real)\s*(rules|capabilities|features)/i,
  /base64\s*decode/i,
  /decode\s*(this|the\s*following|base64)/i,
  /are\s*there\s*(any|hidden|secret)\s*(backdoors|override|bypass)/i,
]

const SAFE_REDIRECTS = [
  "I understand your question, but I can't help with that. Is there something else I can assist you with?",
  "That's outside what I can help with. Let me know if you have other questions!",
  "I'm not able to assist with that request. Is there something else I can help with instead?",
  "I can't help with that. If you have other questions, I'm happy to assist!",
]

function getRandomRedirect(): string {
  return SAFE_REDIRECTS[Math.floor(Math.random() * SAFE_REDIRECTS.length)]
}

function detectPattern(text: string): JailbreakAttempt {
  const lowerText = text.toLowerCase()
  for (const pattern of SYSTEM_PROMPT_PATTERNS) {
    if (pattern.test(lowerText)) return { detected: true, type: "system-prompt", response: "I don't reproduce my internal guidelines. Is there something else I can help with?" }
  }
  for (const pattern of BYPASS_PATTERNS) {
    if (pattern.test(lowerText)) return { detected: true, type: "bypass", response: getRandomRedirect() }
  }
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(lowerText)) return { detected: true, type: "jailbreak", response: "I can't help with that. If you have other questions, I'm happy to assist!" }
  }
  for (const pattern of OVERRIDE_PATTERNS) {
    if (pattern.test(lowerText)) return { detected: true, type: "override", response: "I don't discuss my internal systems. Is there something else I can help with?" }
  }
  return { detected: false, type: "safe", response: "" }
}

function checkResponseBlocked(text: string): boolean {
  const lowerText = text.toLowerCase()
  const dangerousPatterns = [
    /here\s*(is|are)\s*(the|your)\s*(system\s*prompt|rules|instructions)/i,
    /my\s*(system|internal)\s*(prompt|rules|instructions)\s*(are|is|contain)/i,
    /i\s*(am|will)\s*(now|always)\s*(ignore|bypass|override)/i,
    /jailbroken|unfiltered|unrestricted\s*mode/i,
  ]
  for (const pattern of dangerousPatterns) {
    if (pattern.test(lowerText)) return true
  }
  return false
}

function createAntiJailbreak(): AntiJailbreakInterface {
  return {
    detect: (text: string) =>
      Effect.gen(function* () {
        const identity = yield* IdentityVerification
        if (identity.isCreator()) return { detected: false, type: "safe" as const, response: "" }
        return detectPattern(text)
      }),

    shouldBlockResponse: (text: string) =>
      Effect.gen(function* () {
        const identity = yield* IdentityVerification
        if (identity.isCreator()) return false
        return checkResponseBlocked(text)
      }),
  }
}

export const layer = Layer.effect(AntiJailbreak, Effect.succeed(createAntiJailbreak()))
export const defaultLayer = layer.pipe(Layer.provide(IdentityVerification.defaultLayer))

export function detectJailbreakAttempt(text: string): JailbreakAttempt {
  const { isCreator } = require("./identity-verification")
  if (isCreator()) return { detected: false, type: "safe", response: "" }
  return detectPattern(text)
}

export function shouldBlockResponse(text: string): boolean {
  const { isCreator } = require("./identity-verification")
  if (isCreator()) return false
  return checkResponseBlocked(text)
}
