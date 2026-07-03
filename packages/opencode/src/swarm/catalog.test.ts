import { describe, expect, test } from "bun:test"
import { SWARM_AGENTS, SWARM_PILLARS, buildFromSpec, type SwarmAgentSpec } from "./catalog"

describe("SWARM_AGENTS catalog", () => {
  test("has agents in all 4 pillars", () => {
    const pillars = new Set(SWARM_AGENTS.map((a) => a.pillar))
    expect(pillars.has("code")).toBe(true)
    expect(pillars.has("see")).toBe(true)
    expect(pillars.has("design")).toBe(true)
    expect(pillars.has("act")).toBe(true)
  })

  test("each agent has required fields", () => {
    for (const agent of SWARM_AGENTS) {
      expect(agent.name).toBeTruthy()
      expect(agent.pillar).toBeTruthy()
      expect(agent.category).toBeTruthy()
      expect(agent.description).toBeTruthy()
      expect(Array.isArray(agent.capabilities)).toBe(true)
      expect(Array.isArray(agent.tools)).toBe(true)
      expect(typeof agent.temperature).toBe("number")
      expect(agent.modelPreference).toBeTruthy()
    }
  })

  test("no duplicate names", () => {
    const names = SWARM_AGENTS.map((a) => a.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  test("buildFromSpec produces valid Agent.Info shape", () => {
    const spec: SwarmAgentSpec = {
      name: "test-agent",
      pillar: "code",
      category: "coding",
      description: "A test agent",
      capabilities: ["testing"],
      tools: ["read", "write"],
      temperature: 0.2,
      modelPreference: "coding",
      subAgentRoles: [],
    }
    const agent = buildFromSpec(spec)
    expect(agent.name).toBe("test-agent")
    expect(agent.mode).toBe("subagent")
    expect(agent.toolAllowlist).toEqual(["read", "write"])
    expect(agent.temperature).toBe(0.2)
    expect(agent.options.pillar).toBe("code")
  })
})

describe("SWARM_PILLARS", () => {
  test("has all 4 pillars", () => {
    expect(Object.keys(SWARM_PILLARS)).toEqual(["code", "see", "design", "act"])
  })
})
