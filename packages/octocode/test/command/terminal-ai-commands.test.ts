import { describe, expect, test } from "bun:test"
import { TerminalAICommands } from "@/command/terminal-ai-commands"

describe("TerminalAICommands", () => {
  test("is a non-empty array", () => {
    expect(Array.isArray(TerminalAICommands)).toBe(true)
    expect(TerminalAICommands.length).toBeGreaterThan(0)
  })

  test("every command has a unique name", () => {
    const names = TerminalAICommands.map((cmd) => cmd.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  test("every command has a non-empty description", () => {
    for (const cmd of TerminalAICommands) {
      expect(cmd.description.length).toBeGreaterThan(0)
      expect(typeof cmd.description).toBe("string")
    }
  })

  test("every command has a non-empty template", () => {
    for (const cmd of TerminalAICommands) {
      expect(cmd.template.length).toBeGreaterThan(0)
      expect(typeof cmd.template).toBe("string")
    }
  })

  test("every template contains $ARGUMENTS placeholder", () => {
    for (const cmd of TerminalAICommands) {
      expect(cmd.template).toContain("$ARGUMENTS")
    }
  })

  test("every command name is lowercase and contains no spaces", () => {
    for (const cmd of TerminalAICommands) {
      expect(cmd.name).toBe(cmd.name.toLowerCase())
      expect(cmd.name).not.toContain(" ")
    }
  })

  test("every name contains only alphanumeric chars and hyphens", () => {
    for (const cmd of TerminalAICommands) {
      expect(cmd.name).toMatch(/^[a-z0-9-]+$/)
    }
  })

  test("every command has exactly one slashCommand property", () => {
    const count = TerminalAICommands.filter((cmd) => "slashCommand" in cmd).length
    expect(count).toBe(0)
  })

  test("specific commands exist", () => {
    const names = new Set(TerminalAICommands.map((cmd) => cmd.name))
    const expected = [
      "btw",
      "rewind",
      "teleport",
      "add-dir",
      "sandbox",
      "permissions",
      "plugin",
      "plugins",
      "reload-plugins",
      "ide",
      "terminal-setup",
      "remote-control",
      "remote-env",
      "chrome",
      "install-github-app",
      "fast",
      "plan",
      "todos",
      "context",
      "cost",
      "usage",
      "stats",
      "insights",
      "extra-usage",
      "doctor",
      "release-notes",
      "upgrade",
      "feedback",
      "passes",
      "stickers",
      "mobile",
      "ios",
      "android",
      "vim",
      "color",
      "statusline",
      "output-style",
      "voice",
      "code-review",
      "simplify",
      "security-review",
      "debug",
      "loop",
      "batch",
      "claude-api",
      "run",
      "verify",
      "run-skill-generator",
      "hooks",
      "start-work",
      "ulw",
      "refactor",
      "dream",
      "distill",
      "goal",
      "memory",
    ]
    for (const name of expected) {
      expect(names.has(name)).toBe(true)
    }
  })

  test("subtask commands have subtask=true", () => {
    const subtasks = TerminalAICommands.filter((cmd) => cmd.subtask === true)
    const subtaskNames = new Set(subtasks.map((cmd) => cmd.name))
    const expectedSubtasks = [
      "code-review",
      "simplify",
      "security-review",
      "debug",
      "loop",
      "batch",
      "run",
      "verify",
      "start-work",
      "ulw",
      "refactor",
      "goal",
    ]
    for (const name of expectedSubtasks) {
      expect(subtaskNames.has(name)).toBe(true)
    }
  })

  test("non-subtask commands have subtask undefined or false", () => {
    const nonSubtasks = TerminalAICommands.filter((cmd) => cmd.subtask !== true)
    for (const cmd of nonSubtasks) {
      expect(cmd.subtask === undefined || cmd.subtask === false).toBe(true)
    }
  })

  test("template ends with workspace context", () => {
    for (const cmd of TerminalAICommands) {
      expect(cmd.template).toContain("Use the available project context and tools.")
    }
  })

  test("code-review template focuses on bugs", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "code-review")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("bug-finding")
    expect(cmd!.template).toContain("regressions")
  })

  test("security-review template focuses on security", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "security-review")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("security")
    expect(cmd!.template).toContain("secret")
  })

  test("debug template mentions reproduction", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "debug")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("Reproduce")
  })

  test("doctor template checks environment", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "doctor")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("diagnostic")
  })

  test("plan template does not edit files", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "plan")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("Do not edit files")
  })

  test("run template handles verification", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "run")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("build")
    expect(cmd!.template).toContain("test")
  })

  test("verify template mentions typecheck and lint", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "verify")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("typecheck")
    expect(cmd!.template).toContain("lint")
  })

  test("refactor template preserves behavior", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "refactor")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("preserving behavior")
  })

  test("loop template is iterative", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "loop")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("iterative")
    expect(cmd!.template).toContain("repeat")
  })

  test("batch template handles structured edits", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "batch")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("batch")
    expect(cmd!.template).toContain("structured")
  })

  test("btw template is independent", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "btw")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("by-the-way")
    expect(cmd!.template).toContain("independently")
  })

  test("rewind template reviews changes", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "rewind")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("rollback")
  })

  test("teleport template creates handoff", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "teleport")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("handoff")
  })

  test("cost template estimates resources", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "cost")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("cost")
    expect(cmd!.template).toContain("resource")
  })

  test("usage template summarizes limits", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "usage")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("usage")
    expect(cmd!.template).toContain("quota")
  })

  test("stats template gathers statistics", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "stats")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("statistics")
  })

  test("insights template produces engineering insights", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "insights")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("engineering insights")
  })

  test("todos template scans markers", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "todos")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("TODO")
    expect(cmd!.template).toContain("FIXME")
    expect(cmd!.template).toContain("HACK")
  })

  test("context template summarizes active context", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "context")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("context")
    expect(cmd!.template).toContain("goal")
  })

  test("upgrade template plans upgrade", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "upgrade")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("upgrade")
    expect(cmd!.template).toContain("rollback")
  })

  test("feedback template packages bug report", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "feedback")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("feedback")
    expect(cmd!.template).toContain("reproduction")
  })

  test("fast template handles low-latency", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "fast")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("fast mode")
  })

  test("dream template reviews historical sessions", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "dream")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("historical sessions")
    expect(cmd!.template).toContain("long-term memory")
  })

  test("distill template mines past sessions", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "distill")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("past successful sessions")
    expect(cmd!.template).toContain("skills")
  })

  test("goal template sets stopping condition", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "goal")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("stopping condition")
    expect(cmd!.template).toContain("autonomous")
  })

  test("memory template searches persistent memory", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "memory")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("memory")
  })

  test("ulw template is deep reasoning", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "ulw")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("deep reasoning")
  })

  test("start-work template uses agent blueprint", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "start-work")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("blueprint")
    expect(cmd!.template).toContain("AGENTS.md")
  })

  test("run-skill-generator template analyzes project", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "run-skill-generator")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("project structure")
  })

  test("hooks template inspects automation", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "hooks")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("hooks")
    expect(cmd!.template).toContain("trigger")
  })

  test("claude-api template designs experiments", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "claude-api")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("experiment")
  })

  test("simplify template removes complexity", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "simplify")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("simplif")
  })

  test("plugin template inspects plugin setup", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "plugin")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("plugin")
  })

  test("plugins template lists plugin surfaces", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "plugins")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("plugin surfaces")
  })

  test("reload-plugins template refreshes plugins", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "reload-plugins")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("refresh plugin")
  })

  test("ide template inspects IDE integration", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "ide")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("IDE")
    expect(cmd!.template).toContain("editor")
  })

  test("terminal-setup template reviews terminal", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "terminal-setup")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("terminal")
    expect(cmd!.template).toContain("keybinding")
  })

  test("remote-control template plans remote setup", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "remote-control")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("remote-control")
    expect(cmd!.template).toContain("authentication")
  })

  test("remote-env template reviews environment", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "remote-env")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("environment variables")
  })

  test("chrome template plans browser automation", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "chrome")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("browser")
    expect(cmd!.template).toContain("Chromium")
  })

  test("install-github-app template plans integration", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "install-github-app")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("GitHub app")
  })

  test("release-notes template summarizes changelog", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "release-notes")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("release notes")
    expect(cmd!.template).toContain("changelog")
  })

  test("passes template prepares access instructions", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "passes")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("access")
  })

  test("stickers template prepares swag request", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "stickers")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("stickers")
    expect(cmd!.template).toContain("swag")
  })

  test("mobile template plans mobile setup", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "mobile")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("mobile")
  })

  test("ios template plans iOS setup", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "ios")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("iOS")
  })

  test("android template plans Android setup", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "android")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("Android")
  })

  test("vim template reviews modal editing", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "vim")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("Vim")
    expect(cmd!.template).toContain("modal")
  })

  test("color template proposes colors", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "color")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("color")
    expect(cmd!.template).toContain("accessibility")
  })

  test("statusline template designs status line", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "statusline")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("statusline")
  })

  test("output-style template adjusts format", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "output-style")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("output style")
  })

  test("voice template plans voice input", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "voice")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("voice")
    expect(cmd!.template).toContain("transcription")
  })

  test("extra-usage template plans guardrails", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "extra-usage")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("guardrails")
  })

  test("add-dir template evaluates external directory", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "add-dir")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("external directory")
  })

  test("sandbox template reviews sandbox", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "sandbox")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("sandbox")
    expect(cmd!.template).toContain("filesystem")
  })

  test("permissions template audits boundaries", () => {
    const cmd = TerminalAICommands.find((cmd) => cmd.name === "permissions")
    expect(cmd).toBeDefined()
    expect(cmd!.template).toContain("permission")
    expect(cmd!.template).toContain("boundaries")
  })

  test("no duplicate names in command list", () => {
    const names = TerminalAICommands.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  test("all templates are trimmed (no leading/trailing whitespace)", () => {
    for (const cmd of TerminalAICommands) {
      expect(cmd.template).toBe(cmd.template.trim())
    }
  })

  test("all descriptions are trimmed", () => {
    for (const cmd of TerminalAICommands) {
      expect(cmd.description).toBe(cmd.description.trim())
    }
  })
})
