import { describe, expect, test } from "bun:test"
import { TokenBudget } from "./token-budget"

describe("TokenBudget", () => {
  test("constructor uses defaults", () => {
    const b = new TokenBudget()
    expect(b.getCap()).toBe(12000)
  })

  test("constructor accepts custom config", () => {
    const b = new TokenBudget({ hardCap: 5000 })
    expect(b.getCap()).toBe(5000)
  })

  test("estimateSingleAgent scales with prompt length", () => {
    const b = new TokenBudget()
    expect(b.estimateSingleAgent(400)).toBe(100)
    expect(b.estimateSingleAgent(800)).toBe(200)
    expect(b.estimateSingleAgent(100)).toBe(100) // min floor
  })

  test("calculateBudget derives iterations and parallel from base", () => {
    const b = new TokenBudget({ singleAgentEstimate: 1000, hardCap: 5000 })
    const calc = b.calculateBudget(1000)
    expect(calc.totalBudget).toBe(2200) // 1000 * 2.2
    expect(calc.maxIterations).toBe(2) // floor(2200 / 1000)
    expect(calc.maxParallel).toBe(1) // floor(2 / 3)
  })

  test("calculateBudget caps at hardCap", () => {
    const b = new TokenBudget({ singleAgentEstimate: 500, hardCap: 3000 })
    const calc = b.calculateBudget(5000)
    expect(calc.totalBudget).toBe(3000) // capped
    expect(calc.maxIterations).toBe(6) // floor(3000 / 500)
  })

  test("check returns withinBudget when under cap", () => {
    const b = new TokenBudget({ hardCap: 10000 })
    const result = b.check(3000)
    expect(result.withinBudget).toBe(true)
    expect(result.remainingTokens).toBe(7000)
    expect(result.maxIterationsLeft).toBe(2) // floor(7000 / 3000)
  })

  test("check returns withinBudget false when over cap", () => {
    const b = new TokenBudget({ hardCap: 5000 })
    const result = b.check(5001)
    expect(result.withinBudget).toBe(false)
    expect(result.remainingTokens).toBe(0)
    expect(result.reason).toContain("Budget exceeded")
  })

  test("check returns withinBudget false at exact cap", () => {
    const b = new TokenBudget({ hardCap: 5000 })
    const result = b.check(5000)
    expect(result.withinBudget).toBe(false)
  })

  test("consume accumulates tokens", () => {
    const b = new TokenBudget()
    b.consume(1000)
    b.consume(500)
    expect(b.getUsed()).toBe(1500)
  })

  test("reset clears used tokens", () => {
    const b = new TokenBudget()
    b.consume(3000)
    b.reset()
    expect(b.getUsed()).toBe(0)
  })

  test("check with consumed tokens tracks correctly", () => {
    const b = new TokenBudget({ hardCap: 5000 })
    b.consume(2000)
    const result = b.check(b.getUsed())
    expect(result.withinBudget).toBe(true)
    expect(result.usedTokens).toBe(2000)
    expect(result.remainingTokens).toBe(3000)
  })
})
