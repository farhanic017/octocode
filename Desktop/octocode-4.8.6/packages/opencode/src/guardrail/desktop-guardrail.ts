// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
import { GuardrailService } from "./guardrail"
import type { GuardrailCheck } from "./guardrail"

const PLATFORM = process.platform

const SYSTEM_PATHS_WIN = [
  "C:\\Windows\\System32", "C:\\Windows\\SysWOW64", "C:\\ProgramData",
  "C:\\Users\\*\\AppData\\Local\\Microsoft\\Credentials",
  "C:\\Users\\*\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login Data",
  "C:\\Users\\*\\.ssh", "C:\\Users\\*\\.aws", "C:\\Users\\*\\.env",
  "C:\\Users\\*\\Documents\\.env", "C:\\Users\\*\\Desktop\\.env",
]

const SYSTEM_PATHS_MAC = [
  "/System", "/Library", "/usr/bin", "/usr/sbin", "/etc/hosts",
  "/Users/*/.ssh", "/Users/*/.aws", "/Users/*/.env",
  "/Users/*/Library/Keychains",
]

const SYSTEM_PATHS_LINUX = [
  "/etc", "/usr/bin", "/usr/sbin", "/boot", "/proc", "/sys",
  "/root", "~/.ssh", "~/.aws", "~/.env",
]

const FORBIDDEN_APPS = [
  /1password/i, /bitwarden/i, /keepass/i, /lastpass/i, /dashlane/i,
  /keychain/i, /credential/i, /vault/i,
  /antivirus/i, /malware/i, /firewall/i,
  /regedit/i, /disk.?management/i, /task.?manager/i, /services\.msc/i,
]

const SYSTEM_COMPROMISE_PATTERNS = [
  { pattern: /format|rm\s+-rf|rmdir|del\s+\/[sfq]/i, reason: "Destructive file operation blocked" },
  { pattern: /reg\s+(add|delete|edit)/i, reason: "Registry modification blocked" },
  { pattern: /net\s+(user|localgroup|share)/i, reason: "System user/share modification blocked" },
  { pattern: /sc\s+(create|delete|config)/i, reason: "Service modification blocked" },
  { pattern: /chmod\s+777|chmod\s+\+s/i, reason: "Dangerous permission change blocked" },
  { pattern: /sudo\s+rm|sudo\s+chmod|sudo\s+chown/i, reason: "Root file operations blocked" },
]

const CREDENTIAL_PATTERNS = [
  /password|passwd|pwd|secret.?key|api.?key|token|bearer/i,
  /ssh.?key|private.?key|\.pem|\.key|id_rsa/i,
  /login.?data|credentials|keystore/i,
]

const MALWARE_PATTERNS = [
  { pattern: /\.exe.*download|\.msi.*install|\.bat.*execute|\.cmd.*run|\.scr.*execute/i, reason: "Executable download/install blocked" },
  { pattern: /powershell.*-enc|cmd.*\/c.*powershell|wscript.*\/b/i, reason: "Obfuscated script execution blocked" },
  { pattern: /curl.*\|.*sh|wget.*\|.*bash/i, reason: "Remote code execution blocked" },
]

export class DesktopGuardrailService {
  private guardrail: GuardrailService

  constructor() {
    this.guardrail = new (GuardrailService as any)({
      forbiddenPatterns: [
        ...SYSTEM_COMPROMISE_PATTERNS,
        ...MALWARE_PATTERNS,
      ],
      restrictedPatterns: [
        { pattern: /password|credential/i, reason: "Credential access", confirmMessage: "Agent is trying to access passwords or credentials. Allow?" },
        { pattern: /login|signin/i, reason: "Login attempt", confirmMessage: "Agent wants to log in. Allow?" },
        { pattern: /send.?email|post.?message/i, reason: "Messaging", confirmMessage: "Agent wants to send a message. Allow?" },
        { pattern: /purchase|buy|checkout|payment/i, reason: "Financial action", confirmMessage: "Agent wants to make a purchase. Allow?" },
      ],
      rateLimits: {
        desktop_control: { max: 30, windowMs: 60000 },
        desktop_screenshot: { max: 10, windowMs: 60000 },
        desktop_open_app: { max: 5, windowMs: 60000 },
        browser_navigate: { max: 20, windowMs: 60000 },
        browser_click: { max: 30, windowMs: 60000 },
        browser_type: { max: 15, windowMs: 60000 },
      },
    })
  }

  checkDesktopAction(toolId: string, params: Record<string, unknown>): GuardrailCheck {
    const general = (this.guardrail as any).check(toolId, params)
    if (general.blocked || general.needsConfirmation) return general

    if (toolId === "desktop_control" && params.action === "type") {
      const text = String(params.text || "").toLowerCase()
      for (const pattern of CREDENTIAL_PATTERNS) {
        if (pattern.test(text)) {
          return { level: "restrictive", blocked: true, needsConfirmation: false, reason: "Credential text detected in typed content" }
        }
      }
    }

    if (toolId === "desktop_open_app") {
      const app = String(params.app || "").toLowerCase()
      for (const pattern of FORBIDDEN_APPS) {
        if (pattern.test(app)) {
          return { level: "forbidden", blocked: true, needsConfirmation: false, reason: `App "${params.app}" is restricted` }
        }
      }
    }

    return general
  }

  getSafeSystemPaths(): string[] {
    if (PLATFORM === "win32") return SYSTEM_PATHS_WIN
    if (PLATFORM === "darwin") return SYSTEM_PATHS_MAC
    return SYSTEM_PATHS_LINUX
  }
}
