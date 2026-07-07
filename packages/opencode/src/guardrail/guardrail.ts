// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"

export type ActionLevel = "safe" | "moderate" | "restrictive" | "forbidden"

export interface GuardrailCheck {
  level: ActionLevel
  blocked: boolean
  needsConfirmation: boolean
  reason: string
  confirmMessage?: string
}

export interface GuardrailConfig {
  forbiddenPatterns: Array<{ pattern: RegExp; reason: string }>
  restrictedPatterns: Array<{ pattern: RegExp; reason: string; confirmMessage: string }>
  rateLimits: Record<string, { max: number; windowMs: number }>
}

export interface GuardrailInterface {
  readonly check: (toolId: string, params: Record<string, unknown>) => GuardrailCheck
}

export class GuardrailService extends Context.Service<GuardrailService, GuardrailInterface>()("@octocode/Guardrail") {}

const FORBIDDEN_PATTERNS = [
  { pattern: /sign[\s-]?up|create[\s-]?account|register[\s-]?new|open[\s-]?account/gi, reason: "Account creation blocked" },
  { pattern: /spam[\s-]?bot|bulk[\s-]?send|mass[\s-]?email|blast/gi, reason: "Spam activity blocked" },
  { pattern: /credential[\s-]?stuff|brute[\s-]?force|password[\s-]?spray/gi, reason: "Credential attack blocked" },
  { pattern: /phish|spoof[\s-]?email|fake[\s-]?site|impersonat/gi, reason: "Phishing blocked" },
]

const RESTRICTED_PATTERNS = [
  { pattern: /submit[\s-]?form|fill[\s-]?form|post[\s-]?data/gi, reason: "Form submission", confirmMessage: "Agent wants to submit a form. Allow?" },
  { pattern: /login|sign[\s-]?in|authenticate/gi, reason: "Login attempt", confirmMessage: "Agent wants to log in. Allow?" },
  { pattern: /download[\s-]?file|save[\s-]?file/gi, reason: "File download", confirmMessage: "Agent wants to download a file. Allow?" },
  { pattern: /send[\s-]?message|post[\s-]?comment|reply[\s-]?to/gi, reason: "Messaging", confirmMessage: "Agent wants to send a message or post. Allow?" },
]

const DEFAULT_RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  browser_navigate: { max: 20, windowMs: 60000 },
  browser_click: { max: 30, windowMs: 60000 },
  browser_type: { max: 15, windowMs: 60000 },
  browser_select: { max: 10, windowMs: 60000 },
}

function createGuardrail(config?: Partial<GuardrailConfig>): GuardrailInterface {
  const cfg = {
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    restrictedPatterns: RESTRICTED_PATTERNS,
    rateLimits: DEFAULT_RATE_LIMITS,
    ...config,
  }
  const actionTimestamps = new Map<string, number[]>()

  function checkRate(toolId: string): boolean {
    const limit = cfg.rateLimits[toolId]
    if (!limit) return true
    const now = Date.now()
    const timestamps = actionTimestamps.get(toolId) || []
    const valid = timestamps.filter(t => now - t < limit.windowMs)
    actionTimestamps.set(toolId, valid)
    if (valid.length >= limit.max) return false
    valid.push(now)
    return true
  }

  return {
    check(toolId: string, params: Record<string, unknown>): GuardrailCheck {
      const text = JSON.stringify(params).toLowerCase()
      for (const rule of cfg.forbiddenPatterns) {
        if (rule.pattern.test(text)) {
          return { level: "forbidden", blocked: true, needsConfirmation: false, reason: rule.reason }
        }
      }
      for (const rule of cfg.restrictedPatterns) {
        if (rule.pattern.test(text)) {
          if (!checkRate(toolId)) {
            return { level: "restrictive", blocked: true, needsConfirmation: false, reason: `Rate limit exceeded for ${toolId}` }
          }
          return { level: "restrictive", blocked: false, needsConfirmation: true, reason: rule.reason, confirmMessage: rule.confirmMessage }
        }
      }
      if (!checkRate(toolId)) {
        return { level: "moderate", blocked: true, needsConfirmation: false, reason: `Rate limit exceeded for ${toolId}` }
      }
      return { level: "safe", blocked: false, needsConfirmation: false, reason: "OK" }
    },
  }
}

export const layer = Layer.succeed(GuardrailService, createGuardrail())
export const defaultLayer = layer
