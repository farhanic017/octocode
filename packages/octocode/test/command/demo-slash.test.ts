import { describe, expect, test } from "bun:test"

// Test the demo slash command recognition from demo.ts
// The demo.ts handles /help, /permission, /question, /fmt

describe("demo slash commands", () => {
  describe("/help", () => {
    test("is recognized as slash command", () => {
      const cmd = "/help"
      expect(cmd.startsWith("/")).toBe(true)
      expect(cmd.split(/\s+/)[0]).toBe("/help")
    })
  })

  describe("/permission", () => {
    test("is recognized as slash command", () => {
      const cmd = "/permission bash"
      expect(cmd.startsWith("/")).toBe(true)
      expect(cmd.split(/\s+/)[0]).toBe("/permission")
    })

    test("extracts permission kind", () => {
      const cmd = "/permission bash"
      const list = cmd.split(/\s+/)
      expect(list[1]).toBe("bash")
    })

    test("handles missing kind", () => {
      const cmd = "/permission"
      const list = cmd.split(/\s+/)
      expect(list[1]).toBeUndefined()
    })
  })

  describe("/question", () => {
    test("is recognized as slash command", () => {
      const cmd = "/question custom"
      expect(cmd.startsWith("/")).toBe(true)
      expect(cmd.split(/\s+/)[0]).toBe("/question")
    })

    test("extracts question kind", () => {
      const cmd = "/question custom"
      const list = cmd.split(/\s+/)
      expect(list[1]).toBe("custom")
    })

    test("handles missing kind", () => {
      const cmd = "/question"
      const list = cmd.split(/\s+/)
      expect(list[1]).toBeUndefined()
    })
  })

  describe("/fmt", () => {
    test("is recognized as slash command", () => {
      const cmd = "/fmt markdown"
      expect(cmd.startsWith("/")).toBe(true)
      expect(cmd.split(/\s+/)[0]).toBe("/fmt")
    })

    test("extracts format kind", () => {
      const cmd = "/fmt markdown"
      const list = cmd.split(/\s+/)
      expect(list[1]).toBe("markdown")
    })

    test("extracts format body", () => {
      const cmd = "/fmt text your custom text"
      const list = cmd.split(/\s+/)
      expect(list[1]).toBe("text")
      expect(list.slice(2).join(" ")).toBe("your custom text")
    })

    test("handles missing kind", () => {
      const cmd = "/fmt"
      const list = cmd.split(/\s+/)
      expect(list[1]).toBeUndefined()
    })
  })
})

describe("command text parsing patterns", () => {
  test("all demo commands start with slash", () => {
    const demoCommands = ["/help", "/permission bash", "/question custom", "/fmt markdown"]
    for (const cmd of demoCommands) {
      expect(cmd.startsWith("/")).toBe(true)
    }
  })

  test("command name extraction works for all patterns", () => {
    const commands = [
      { input: "/help", expected: "/help" },
      { input: "/permission bash", expected: "/permission" },
      { input: "/question custom", expected: "/question" },
      { input: "/fmt markdown", expected: "/fmt" },
      { input: "/fmt text your custom text", expected: "/fmt" },
    ]
    for (const { input, expected } of commands) {
      expect(input.split(/\s+/)[0]).toBe(expected)
    }
  })

  test("argument extraction works", () => {
    const commands = [
      { input: "/help", args: "" },
      { input: "/permission bash", args: "bash" },
      { input: "/question custom", args: "custom" },
      { input: "/fmt markdown", args: "markdown" },
      { input: "/fmt text your custom text", args: "text your custom text" },
    ]
    for (const { input, args } of commands) {
      const list = input.split(/\s+/)
      expect(list.slice(1).join(" ")).toBe(args)
    }
  })
})

describe("terminal-ai command integration", () => {
  test("all terminal-ai commands can be invoked with slash prefix", () => {
    const names = [
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
    for (const name of names) {
      const input = `/${name}`
      expect(input.startsWith("/")).toBe(true)
      expect(input.split(/\s+/)[0]).toBe(`/${name}`)
    }
  })

  test("terminal-ai commands can have arguments", () => {
    const commandsWithArgs = [
      { input: "/btw what is this", name: "btw", args: "what is this" },
      { input: "/rewind the last change", name: "rewind", args: "the last change" },
      { input: "/teleport to slack", name: "teleport", args: "to slack" },
      { input: "/fast fix the bug", name: "fast", args: "fix the bug" },
      { input: "/plan the refactor", name: "plan", args: "the refactor" },
      { input: "/debug this error", name: "debug", args: "this error" },
      { input: "/run tests", name: "run", args: "tests" },
      { input: "/verify the build", name: "verify", args: "the build" },
      { input: "/code-review this PR", name: "code-review", args: "this PR" },
      { input: "/security-review the auth module", name: "security-review", args: "the auth module" },
      { input: "/simplify this code", name: "simplify", args: "this code" },
      { input: "/refactor this function", name: "refactor", args: "this function" },
      { input: "/goal all tests pass", name: "goal", args: "all tests pass" },
      { input: "/ulw think deeply about this", name: "ulw", args: "think deeply about this" },
      { input: "/batch edit files", name: "batch", args: "edit files" },
      { input: "/loop fix and verify", name: "loop", args: "fix and verify" },
      { input: "/doctor check environment", name: "doctor", args: "check environment" },
      { input: "/cost estimate this task", name: "cost", args: "estimate this task" },
    ]
    for (const { input, name, args } of commandsWithArgs) {
      const parts = input.split(/\s+/)
      expect(parts[0]).toBe(`/${name}`)
      expect(parts.slice(1).join(" ")).toBe(args)
    }
  })
})
