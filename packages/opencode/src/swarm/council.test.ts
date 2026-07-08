import { describe, expect, test } from "bun:test"
import { runCouncilVote } from "./council"

const AGENTS = [
  { name: "coder", pillar: "code" },
  { name: "security", pillar: "code" },
  { name: "testing", pillar: "code" },
  { name: "researcher", pillar: "see" },
  { name: "reviewer", pillar: "code" },
  { name: "council_master", pillar: "act" },
  { name: "legal", pillar: "act" },
  { name: "trading", pillar: "act" },
  { name: "finance", pillar: "act" },
]

describe("runCouncilVote", () => {
  test("returns reject for empty question", () => {
    const result = runCouncilVote("", AGENTS)
    expect(result.verdict).toBe("reject")
    expect(result.confidence).toBe(0)
  })

  test("positive question gets proceed verdict", () => {
    const result = runCouncilVote("build a new feature that adds user login and improves the app", AGENTS, 6)
    expect(result.verdict).toBe("proceed")
    expect(result.yesVotes).toBeGreaterThan(result.noVotes)
    expect(result.confidence).toBeGreaterThan(50)
  })

  test("risky question can get reject from security agents", () => {
    const result = runCouncilVote("delete all user data and remove security checks", AGENTS, 6)
    expect(result.opinions.length).toBeGreaterThan(0)
    const securityOpinions = result.opinions.filter((o) => o.agentName === "security")
    if (securityOpinions.length > 0) {
      expect(securityOpinions[0].stance).toBe("reject")
    }
  })

  test("verdict matches vote majority", () => {
    const result = runCouncilVote("add analytics dashboard for market research", AGENTS, 4)
    if (result.yesVotes > result.noVotes) {
      expect(result.verdict).toBe("proceed")
    }
    if (result.noVotes > result.yesVotes) {
      expect(result.verdict).toBe("reject")
    }
  })

  test("opinions have all required fields", () => {
    const result = runCouncilVote("test the application thoroughly", AGENTS, 3)
    for (const opinion of result.opinions) {
      expect(opinion.agentName).toBeTruthy()
      expect(opinion.pillar).toBeTruthy()
      expect(["proceed", "reject"]).toContain(opinion.stance)
      expect(typeof opinion.confidence).toBe("number")
      expect(opinion.confidence).toBeGreaterThanOrEqual(0)
      expect(opinion.confidence).toBeLessThanOrEqual(100)
      expect(opinion.reasoning).toBeTruthy()
      expect(Array.isArray(opinion.risks)).toBe(true)
      expect(Array.isArray(opinion.evidence)).toBe(true)
    }
  })
})
