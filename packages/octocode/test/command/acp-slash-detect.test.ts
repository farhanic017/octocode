import { describe, expect, test } from "bun:test"

// Replicate the ACP detectSlashCommand from acp/service.ts for testing
type TextPart = { type: "text"; text: string }
type ImagePart = { type: "image"; image: string }
type Part = TextPart | ImagePart

function detectSlashCommand(parts: Part[]) {
  const text = parts
    .filter((part): part is TextPart => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
  if (!text.startsWith("/")) return

  const [name, ...rest] = text.slice(1).split(/\s+/)
  if (!name) return
  return { name, args: rest.join(" ").trim() }
}

function text(text: string): TextPart {
  return { type: "text", text }
}

function image(url: string): ImagePart {
  return { type: "image", image: url }
}

describe("ACP detectSlashCommand", () => {
  test("returns undefined for non-slash text", () => {
    expect(detectSlashCommand([text("hello")])).toBeUndefined()
  })

  test("returns undefined for empty parts", () => {
    expect(detectSlashCommand([])).toBeUndefined()
  })

  test("returns undefined for empty text", () => {
    expect(detectSlashCommand([text("")])).toBeUndefined()
  })

  test("returns undefined for whitespace only", () => {
    expect(detectSlashCommand([text("   ")])).toBeUndefined()
  })

  test("returns undefined for slash with no command name", () => {
    expect(detectSlashCommand([text("/")])).toBeUndefined()
  })

  test("parses simple command", () => {
    expect(detectSlashCommand([text("/help")])).toEqual({ name: "help", args: "" })
  })

  test("parses command with arguments", () => {
    expect(detectSlashCommand([text("/run tests")])).toEqual({ name: "run", args: "tests" })
  })

  test("parses command with multiple arguments", () => {
    expect(detectSlashCommand([text("/debug fix the bug")])).toEqual({ name: "debug", args: "fix the bug" })
  })

  test("trims leading/trailing whitespace", () => {
    expect(detectSlashCommand([text("  /help  ")])).toEqual({ name: "help", args: "" })
  })

  test("trims arguments", () => {
    expect(detectSlashCommand([text("/run  tests  ")])).toEqual({ name: "run", args: "tests" })
  })

  test("handles multiple text parts joined", () => {
    expect(detectSlashCommand([text("/help"), text(" me")])).toEqual({ name: "help", args: "me" })
  })

  test("handles text parts with no separator", () => {
    // Text parts are joined without spaces, so "/help" + "me" = "/helpme"
    expect(detectSlashCommand([text("/help"), text("me")])).toEqual({ name: "helpme", args: "" })
  })

  test("ignores image parts", () => {
    expect(detectSlashCommand([image("https://example.com/img.png"), text("/help")])).toEqual({
      name: "help",
      args: "",
    })
  })

  test("ignores image parts in middle", () => {
    expect(detectSlashCommand([text("/run"), image("https://example.com/img.png"), text(" tests")])).toEqual({
      name: "run",
      args: "tests",
    })
  })

  test("handles mixed parts with non-text", () => {
    expect(
      detectSlashCommand([text("/help"), { type: "other" } as any, text(" me")]),
    ).toEqual({ name: "help", args: "me" })
  })

  test("returns undefined when joined text doesn't start with slash", () => {
    expect(detectSlashCommand([text("hello"), text("/help")])).toBeUndefined()
  })

  test("returns undefined for just a slash", () => {
    expect(detectSlashCommand([text("/")])).toBeUndefined()
  })

  test("returns undefined for slash followed by whitespace only", () => {
    expect(detectSlashCommand([text("/   ")])).toBeUndefined()
  })

  test("handles tabs in arguments", () => {
    expect(detectSlashCommand([text("/run\ttests")])).toEqual({ name: "run", args: "tests" })
  })

  test("handles newline in arguments", () => {
    expect(detectSlashCommand([text("/help\nme")])).toEqual({ name: "help", args: "me" })
  })

  test("handles hyphenated command names", () => {
    expect(detectSlashCommand([text("/code-review")])).toEqual({ name: "code-review", args: "" })
  })

  test("handles hyphenated command with arguments", () => {
    expect(detectSlashCommand([text("/code-review please check")])).toEqual({
      name: "code-review",
      args: "please check",
    })
  })

  test("handles all command names from terminal-ai-commands", () => {
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
      const result = detectSlashCommand([text(`/${name}`)])
      expect(result).toEqual({ name, args: "" })
    }
  })

  test("handles all command names with arguments", () => {
    const names = ["help", "exit", "new", "run", "debug", "plan", "refactor", "code-review"]
    for (const name of names) {
      const result = detectSlashCommand([text(`/${name} some arguments here`)])
      expect(result).toEqual({ name, args: "some arguments here" })
    }
  })
})
