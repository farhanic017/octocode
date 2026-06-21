import { describe, test, expect } from "bun:test"
import { getBuiltinMCPs, BuiltinMCPs } from "../../src/mcp/builtin"

describe("BuiltinMCPs", () => {
  test("defines graphify and obsidian MCPs", () => {
    expect(BuiltinMCPs.graphify).toBeDefined()
    expect(BuiltinMCPs.obsidian).toBeDefined()
  })

  test("graphify is a local MCP with correct command", () => {
    const graphify = BuiltinMCPs.graphify
    expect(graphify.type).toBe("local")
    expect(graphify.command).toEqual(["python3", "-m", "graphify.serve"])
    expect(graphify.enabled).toBe(true)
    expect(graphify.timeout).toBe(30000)
  })

  test("obsidian is a local MCP with correct command", () => {
    const obsidian = BuiltinMCPs.obsidian
    expect(obsidian.type).toBe("local")
    expect(obsidian.command).toEqual(["npx", "-y", "@anthropic/mcp-obsidian"])
    expect(obsidian.enabled).toBe(true)
    expect(obsidian.timeout).toBe(15000)
  })

  test("obsidian has default environment variables", () => {
    const obsidian = BuiltinMCPs.obsidian
    expect(obsidian.type).toBe("local")
    if (obsidian.type === "local") {
      expect(obsidian.environment?.OBSIDIAN_HOST).toBe("localhost")
      expect(obsidian.environment?.OBSIDIAN_PORT).toBe("27123")
    }
  })
})

describe("getBuiltinMCPs", () => {
  test("returns all built-in MCPs when no user config", () => {
    const result = getBuiltinMCPs()
    expect(result.graphify).toBeDefined()
    expect(result.obsidian).toBeDefined()
    expect(Object.keys(result)).toHaveLength(2)
  })

  test("preserves built-in MCPs with user overrides", () => {
    const result = getBuiltinMCPs({
      graphify: { enabled: false },
    })
    expect(result.graphify).toBeDefined()
    expect(result.graphify.enabled).toBe(false)
    expect(result.obsidian).toBeDefined()
  })

  test("merges user-provided MCP config with built-in", () => {
    const result = getBuiltinMCPs({
      obsidian: {
        type: "local",
        command: ["custom-obsidian-command"],
        environment: {
          OBSIDIAN_API_KEY: "user-key",
        },
      },
    })
    expect(result.obsidian).toBeDefined()
    if (result.obsidian.type === "local") {
      expect(result.obsidian.command).toEqual(["custom-obsidian-command"])
      expect(result.obsidian.environment?.OBSIDIAN_API_KEY).toBe("user-key")
    }
  })

  test("adds user-defined non-built-in MCPs", () => {
    const result = getBuiltinMCPs({
      "custom-mcp": {
        type: "remote",
        url: "https://custom-mcp.example.com",
      },
    })
    expect(result.graphify).toBeDefined()
    expect(result.obsidian).toBeDefined()
    expect(result["custom-mcp"]).toBeDefined()
    expect(result["custom-mcp"].type).toBe("remote")
  })

  test("user enabled:false overrides built-in enabled:true", () => {
    const result = getBuiltinMCPs({
      graphify: { enabled: false },
      obsidian: { enabled: false },
    })
    expect(result.graphify.enabled).toBe(false)
    expect(result.obsidian.enabled).toBe(false)
  })
})
