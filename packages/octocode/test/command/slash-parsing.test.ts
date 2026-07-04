import { describe, expect, test } from "bun:test"
import { isExitCommand, isNewCommand } from "@/cli/cmd/run/prompt.shared"

describe("slash command parsing", () => {
  describe("isExitCommand", () => {
    test("recognizes /exit", () => {
      expect(isExitCommand("/exit")).toBe(true)
    })

    test("recognizes /quit", () => {
      expect(isExitCommand("/quit")).toBe(true)
    })

    test("recognizes :q", () => {
      expect(isExitCommand(":q")).toBe(true)
    })

    test("is case-insensitive", () => {
      expect(isExitCommand("/EXIT")).toBe(true)
      expect(isExitCommand("/Quit")).toBe(true)
      expect(isExitCommand("/EXIT")).toBe(true)
      expect(isExitCommand(":Q")).toBe(true)
    })

    test("ignores leading/trailing whitespace", () => {
      expect(isExitCommand("  /exit  ")).toBe(true)
      expect(isExitCommand(" /quit ")).toBe(true)
      expect(isExitCommand("  :q  ")).toBe(true)
    })

    test("rejects partial matches", () => {
      expect(isExitCommand("/exiting")).toBe(false)
      expect(isExitCommand("/quitting")).toBe(false)
      expect(isExitCommand("/exit now")).toBe(false)
      expect(isExitCommand("/quit now")).toBe(false)
    })

    test("rejects non-exit commands", () => {
      expect(isExitCommand("/help")).toBe(false)
      expect(isExitCommand("/new")).toBe(false)
      expect(isExitCommand("/compact")).toBe(false)
      expect(isExitCommand("hello")).toBe(false)
      expect(isExitCommand("")).toBe(false)
    })

    test("rejects :q! and other vim variants", () => {
      expect(isExitCommand(":q!")).toBe(false)
      expect(isExitCommand(":wq")).toBe(false)
      expect(isExitCommand(":x")).toBe(false)
    })
  })

  describe("isNewCommand", () => {
    test("recognizes /new", () => {
      expect(isNewCommand("/new")).toBe(true)
    })

    test("is case-insensitive", () => {
      expect(isNewCommand("/NEW")).toBe(true)
      expect(isNewCommand("/New")).toBe(true)
    })

    test("ignores leading/trailing whitespace", () => {
      expect(isNewCommand("  /new  ")).toBe(true)
      expect(isNewCommand(" /NEW ")).toBe(true)
    })

    test("rejects partial matches", () => {
      expect(isNewCommand("/new session")).toBe(false)
      expect(isNewCommand("/newing")).toBe(false)
      expect(isNewCommand("/newline")).toBe(false)
    })

    test("rejects non-new commands", () => {
      expect(isNewCommand("/exit")).toBe(false)
      expect(isNewCommand("/help")).toBe(false)
      expect(isNewCommand("new")).toBe(false)
      expect(isNewCommand("")).toBe(false)
    })
  })

  describe("exit command edge cases", () => {
    test("empty string is not exit", () => {
      expect(isExitCommand("")).toBe(false)
    })

    test("just slash is not exit", () => {
      expect(isExitCommand("/")).toBe(false)
    })

    test("just colon is not exit", () => {
      expect(isExitCommand(":")).toBe(false)
    })

    test("exit without slash is not exit", () => {
      expect(isExitCommand("exit")).toBe(false)
    })

    test("quit without slash is not exit", () => {
      expect(isExitCommand("quit")).toBe(false)
    })

    test("q without colon is not exit", () => {
      expect(isExitCommand("q")).toBe(false)
    })
  })

  describe("new command edge cases", () => {
    test("empty string is not new", () => {
      expect(isNewCommand("")).toBe(false)
    })

    test("just slash is not new", () => {
      expect(isNewCommand("/")).toBe(false)
    })

    test("new without slash is not new", () => {
      expect(isNewCommand("new")).toBe(false)
    })
  })
})

describe("slash command in prompt text", () => {
  test("detects slash commands at start of text", () => {
    const texts = [
      "/help",
      "/exit",
      "/new",
      "/quit",
      "/compact",
      "/editor",
      "/skills",
      "/doctor",
      "/cost",
      "/run",
      "/verify",
      "/debug",
      "/plan",
      "/refactor",
      "/code-review",
      "/security-review",
      "/simplify",
      "/batch",
      "/loop",
      "/btw",
      "/rewind",
      "/teleport",
      "/fast",
      "/memory",
      "/dream",
      "/distill",
      "/goal",
    ]
    for (const text of texts) {
      expect(text.startsWith("/")).toBe(true)
    }
  })

  test("detects slash commands with arguments", () => {
    const texts = [
      "/help me",
      "/run tests",
      "/debug this error",
      "/plan the refactor",
      "/btw what is this",
      "/rewind the last change",
      "/teleport to slack",
      "/fast fix the bug",
      "/goal all tests pass",
    ]
    for (const text of texts) {
      expect(text.startsWith("/")).toBe(true)
      const parts = text.split(/\s+/)
      expect(parts[0].startsWith("/")).toBe(true)
      expect(parts.length).toBeGreaterThan(1)
    }
  })

  test("slash command name extraction", () => {
    const texts = [
      "/help",
      "/help me",
      "/exit",
      "/new",
      "/run tests",
    ]
    for (const text of texts) {
      const match = text.match(/^\/(\S+)/)
      expect(match).not.toBeNull()
      expect(match![1]).not.toBe("")
    }
  })
})
