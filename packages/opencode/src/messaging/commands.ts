import type { Permission } from "./users.sql"

export interface CommandResult {
  response: string
  handled: boolean
}

export function isCommand(text: string): boolean {
  return text.startsWith("/")
}

export function parseCommand(text: string): { command: string; args: string[] } {
  const parts = text.trim().split(/\s+/)
  const command = parts[0].slice(1).toLowerCase()
  const args = parts.slice(1)
  return { command, args }
}

export function handleCommand(
  command: string,
  args: string[],
  userId: string,
  platform: string,
  permission: Permission,
): CommandResult {
  if (permission === "blocked") {
    return { response: "You are blocked from using this bot.", handled: true }
  }

  const full = permission === "full"
  const argStr = args.join(" ")

  switch (command) {
    case "help":
    case "commands":
      return {
        response: [
          "OctoCode v4.2.1 — Commands:",
          "",
          "General:",
          "  /help — This help",
          "  /version — Version info",
          "  /whoami — Your info",
          "  /status — Agent status",
          "",
          "Full access only:",
          "  /model <name> — Switch model (gpt-4o, claude-sonnet, etc.)",
          "  /effort <1-10> — Reasoning effort",
          "  /sessions — List sessions",
          "  /bash <cmd> — Execute shell command",
          "  /read <file> — Read a file",
          "  /write <file> <content> — Write to file",
          "  /websearch <query> — Search the web",
          "  /webfetch <url> — Fetch a webpage",
          "  /memory <query> — Search memory",
          "  /cron <name> <schedule> <cmd> — Schedule task",
          "  /checkpoint — Create a checkpoint",
          "",
          "Access Control (full only):",
          "  /allow <platform> <id> <perm> — Grant access",
          "  /deny <platform> <id> — Block user",
          "  /users — List all users",
          "",
          "Any message without / goes directly to the AI agent.",
        ].join("\n"),
        handled: true,
      }

    case "version":
      return { response: "OctoCode v4.2.1", handled: true }

    case "whoami":
      return { response: `Platform: ${platform}\nUser ID: ${userId}\nPermission: ${permission}`, handled: true }

    case "status":
      if (!full) return { response: "Full access required.", handled: true }
      return { response: "Agent online. All systems operational.", handled: true }

    case "model":
      if (!full) return { response: "Full access required.", handled: true }
      return { response: `Model set to: ${argStr || "default"}\n(Note: model switching applies to next agent turn)`, handled: true }

    case "effort":
      if (!full) return { response: "Full access required.", handled: true }
      return { response: `Effort: ${argStr || "5"} (1=quick, 10=thorough)`, handled: true }

    case "sessions":
      if (!full) return { response: "Full access required.", handled: true }
      return { response: "Session listing available in TUI.", handled: true }

    case "allow":
      if (!full) return { response: "Full access required.", handled: true }
      return { response: `Processing: /allow ${argStr}\nUse TUI for user management.`, handled: true }

    case "deny":
      if (!full) return { response: "Full access required.", handled: true }
      return { response: `Processing: /deny ${argStr}\nUse TUI for user management.`, handled: true }

    case "users":
    case "permissions":
      return { response: "Use TUI to list users and manage permissions.", handled: true }

    default:
      return { response: `Unknown command: /${command}\nType /help for commands.`, handled: true }
  }
}
