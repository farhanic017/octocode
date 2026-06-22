import { describe, expect, test } from "bun:test"

// Replicate the slashHead function from footer.prompt.tsx for testing
function slashHead(text: string) {
  if (!text.startsWith("/")) {
    return
  }

  for (let i = 1; i < text.length; i++) {
    switch (text[i]) {
      case " ":
      case "\t":
      case "\n":
        return { name: text.slice(1, i), arguments: text.slice(i + 1), end: i }
    }
  }

  return { name: text.slice(1), arguments: "", end: text.length }
}

function slashQuery(text: string, cursor: number) {
  const head = slashHead(text.slice(0, cursor))
  if (!head || head.end !== cursor) {
    return
  }

  return head.name
}

function parseSlashCommand(
  text: string,
  commands: Array<{ name: string; description?: string }> | undefined,
) {
  const head = slashHead(text)
  if (!head || head.name.length === 0) {
    return { type: "none" as const }
  }

  if (!commands) {
    return { type: "pending" as const }
  }

  if (!commands.some((item) => item.name === head.name)) {
    return { type: "none" as const }
  }

  return { type: "command" as const, command: { name: head.name, arguments: head.arguments } }
}

describe("slashHead parsing", () => {
  test("returns undefined for non-slash text", () => {
    expect(slashHead("hello")).toBeUndefined()
    expect(slashHead("")).toBeUndefined()
    expect(slashHead("test")).toBeUndefined()
    expect(slashHead("!command")).toBeUndefined()
  })

  test("parses command name without arguments", () => {
    const result = slashHead("/help")
    expect(result).toEqual({ name: "help", arguments: "", end: 5 })
  })

  test("parses command name with arguments", () => {
    const result = slashHead("/run tests")
    expect(result).toEqual({ name: "run", arguments: "tests", end: 4 })
  })

  test("parses command name with multiple arguments", () => {
    const result = slashHead("/debug fix the bug")
    expect(result).toEqual({ name: "debug", arguments: "fix the bug", end: 6 })
  })

  test("handles tab separator", () => {
    const result = slashHead("/help\tme")
    expect(result).toEqual({ name: "help", arguments: "me", end: 5 })
  })

  test("handles newline separator", () => {
    const result = slashHead("/help\nme")
    expect(result).toEqual({ name: "help", arguments: "me", end: 5 })
  })

  test("handles empty arguments after space", () => {
    const result = slashHead("/help ")
    expect(result).toEqual({ name: "help", arguments: "", end: 5 })
  })

  test("handles single character command", () => {
    const result = slashHead("/q")
    expect(result).toEqual({ name: "q", arguments: "", end: 2 })
  })

  test("handles single slash only", () => {
    const result = slashHead("/")
    expect(result).toEqual({ name: "", arguments: "", end: 1 })
  })

  test("handles command with spaces in arguments", () => {
    const result = slashHead("/plan refactor the code")
    expect(result).toEqual({ name: "plan", arguments: "refactor the code", end: 5 })
  })

  test("handles very long command names", () => {
    const result = slashHead("/run-skill-generator")
    expect(result).toEqual({ name: "run-skill-generator", arguments: "", end: 20 })
  })

  test("handles command with hyphens", () => {
    const result = slashHead("/code-review please")
    expect(result).toEqual({ name: "code-review", arguments: "please", end: 12 })
  })

  test("handles command with numbers", () => {
    const result = slashHead("/cmd123 arg")
    expect(result).toEqual({ name: "cmd123", arguments: "arg", end: 7 })
  })
})

describe("slashQuery parsing", () => {
  test("returns name when cursor is at end of slash command", () => {
    expect(slashQuery("/help", 5)).toBe("help")
    expect(slashQuery("/run", 4)).toBe("run")
    expect(slashQuery("/exit", 5)).toBe("exit")
  })

  test("returns partial name during typing", () => {
    expect(slashQuery("/hel", 4)).toBe("hel")
    expect(slashQuery("/ru", 3)).toBe("ru")
    expect(slashQuery("/", 1)).toBe("")
  })

  test("returns name when cursor is at end of command name", () => {
    // "/help me" sliced to cursor 5 = "/help", head.end=5, cursor=5 → match
    expect(slashQuery("/help me", 5)).toBe("help")
    // "/run tests" sliced to cursor 4 = "/run", head.end=4, cursor=4 → match
    expect(slashQuery("/run tests", 4)).toBe("run")
  })

  test("returns undefined when cursor is past command name", () => {
    // "/help me" sliced to cursor 7 = "/help ", head.end=5, cursor=7 → no match
    expect(slashQuery("/help me", 7)).toBeUndefined()
    // "/help me" sliced to cursor 8 = "/help m", head.end=5, cursor=8 → no match
    expect(slashQuery("/help me", 8)).toBeUndefined()
  })

  test("returns undefined for non-slash text", () => {
    expect(slashQuery("hello", 5)).toBeUndefined()
    expect(slashQuery("", 0)).toBeUndefined()
  })

  test("returns undefined for empty text", () => {
    expect(slashQuery("", 0)).toBeUndefined()
  })

  test("returns partial name when cursor is mid-command", () => {
    // "/help" sliced to cursor 3 = "/he", head.end=3, cursor=3 → match
    expect(slashQuery("/help", 3)).toBe("he")
  })

  test("returns empty name for just slash", () => {
    expect(slashQuery("/", 1)).toBe("")
  })
})

describe("parseSlashCommand", () => {
  const commands = [
    { name: "help", description: "Show help" },
    { name: "exit", description: "Exit" },
    { name: "run", description: "Run tests" },
    { name: "debug", description: "Debug" },
    { name: "code-review", description: "Review code" },
  ]

  test("returns none for empty text", () => {
    expect(parseSlashCommand("", commands)).toEqual({ type: "none" })
  })

  test("returns none for non-slash text", () => {
    expect(parseSlashCommand("hello", commands)).toEqual({ type: "none" })
  })

  test("returns none for slash with no command name", () => {
    expect(parseSlashCommand("/", commands)).toEqual({ type: "none" })
  })

  test("returns none for unknown command", () => {
    expect(parseSlashCommand("/unknown", commands)).toEqual({ type: "none" })
  })

  test("returns command for known command", () => {
    expect(parseSlashCommand("/help", commands)).toEqual({
      type: "command",
      command: { name: "help", arguments: "" },
    })
  })

  test("returns command with arguments", () => {
    expect(parseSlashCommand("/run tests", commands)).toEqual({
      type: "command",
      command: { name: "run", arguments: "tests" },
    })
  })

  test("returns command with multiple arguments", () => {
    expect(parseSlashCommand("/debug fix the bug", commands)).toEqual({
      type: "command",
      command: { name: "debug", arguments: "fix the bug" },
    })
  })

  test("returns pending when commands is undefined", () => {
    expect(parseSlashCommand("/help", undefined)).toEqual({ type: "pending" })
  })

  test("returns pending when commands is null", () => {
    expect(parseSlashCommand("/help", null as any)).toEqual({ type: "pending" })
  })

  test("handles hyphenated command names", () => {
    expect(parseSlashCommand("/code-review", commands)).toEqual({
      type: "command",
      command: { name: "code-review", arguments: "" },
    })
  })

  test("handles hyphenated command with arguments", () => {
    expect(parseSlashCommand("/code-review please check this", commands)).toEqual({
      type: "command",
      command: { name: "code-review", arguments: "please check this" },
    })
  })
})
