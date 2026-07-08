import { describe, expect, test } from "bun:test"
import { parsePlainMarkdown } from "./markdown-fallback"

describe("parsePlainMarkdown", () => {
  test("extracts name from # heading", () => {
    const result = parsePlainMarkdown("# my-skill\n\nSome content here")
    expect(result).toEqual({ name: "my-skill", description: "" })
  })

  test("extracts description from > blockquote after heading", () => {
    const result = parsePlainMarkdown("# my-skill\n\n> A short description\n\nBody text")
    expect(result).toEqual({ name: "my-skill", description: "A short description" })
  })

  test("returns null when no heading found", () => {
    const result = parsePlainMarkdown("Just some text without a heading")
    expect(result).toBeNull()
  })

  test("returns null for empty content", () => {
    const result = parsePlainMarkdown("")
    expect(result).toBeNull()
  })

  test("uses first heading when multiple exist", () => {
    const result = parsePlainMarkdown("# first-heading\n\n> first desc\n\n## second-heading\n\n> second desc")
    expect(result).toEqual({ name: "first-heading", description: "first desc" })
  })

  test("uses first blockquote after heading", () => {
    const result = parsePlainMarkdown("# my-skill\n\n> first blockquote\n\nSome text\n\n> second blockquote")
    expect(result).toEqual({ name: "my-skill", description: "first blockquote" })
  })

  test("handles heading with extra whitespace", () => {
    const result = parsePlainMarkdown("#   my-skill   \n\n> desc")
    expect(result).toEqual({ name: "my-skill", description: "desc" })
  })

  test("handles blockquote with extra whitespace", () => {
    const result = parsePlainMarkdown("# my-skill\n\n>   A description   ")
    expect(result).toEqual({ name: "my-skill", description: "A description" })
  })

  test("handles content between heading and blockquote", () => {
    const result = parsePlainMarkdown("# my-skill\n\nSome intro text\n\n> The actual description\n\nBody")
    expect(result).toEqual({ name: "my-skill", description: "The actual description" })
  })

  test("returns empty description when no blockquote", () => {
    const result = parsePlainMarkdown("# my-skill\n\nJust body text, no blockquote")
    expect(result).toEqual({ name: "my-skill", description: "" })
  })

  test("handles Gemini-style format", () => {
    const content = `# my-gemini-skill

> This blockquote description identifies the skill.

The body must be long enough to identify this file as a useful skill.`
    expect(parsePlainMarkdown(content)).toEqual({
      name: "my-gemini-skill",
      description: "This blockquote description identifies the skill.",
    })
  })
})
