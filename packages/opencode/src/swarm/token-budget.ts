export interface TokenBudgetConfig {
  singleAgentEstimate: number
  overheadMultiplier: number
  hardCap: number
}

export interface BudgetCheckResult {
  withinBudget: boolean
  usedTokens: number
  remainingTokens: number
  maxIterationsLeft: number
  reason?: string
}

export interface BudgetCalculation {
  totalBudget: number
  maxIterations: number
  maxParallel: number
}

const DEFAULTS: TokenBudgetConfig = {
  singleAgentEstimate: 3000,
  overheadMultiplier: 2.2,
  hardCap: 12000,
}

export class TokenBudget {
  private config: TokenBudgetConfig
  private usedTokens: number
  private maxIterations: number

  constructor(config?: Partial<TokenBudgetConfig>) {
    this.config = { ...DEFAULTS, ...config }
    this.usedTokens = 0
    this.maxIterations = Math.floor(this.config.hardCap / this.config.singleAgentEstimate)
  }

  estimateSingleAgent(promptLength: number): number {
    return Math.max(100, Math.round(promptLength / 4))
  }

  calculateBudget(baseEstimate: number): BudgetCalculation {
    const capped = Math.min(baseEstimate, this.config.hardCap)
    const totalBudget = Math.min(
      Math.round(capped * this.config.overheadMultiplier),
      this.config.hardCap,
    )
    const maxIterations = Math.max(1, Math.floor(totalBudget / this.config.singleAgentEstimate))
    const maxParallel = Math.max(1, Math.floor(maxIterations / 3))
    return { totalBudget, maxIterations, maxParallel }
  }

  check(consumedTokens: number): BudgetCheckResult {
    const remaining = this.config.hardCap - consumedTokens
    const maxIterationsLeft = Math.max(0, Math.floor(remaining / this.config.singleAgentEstimate))

    if (consumedTokens >= this.config.hardCap) {
      return {
        withinBudget: false,
        usedTokens: consumedTokens,
        remainingTokens: 0,
        maxIterationsLeft: 0,
        reason: `Budget exceeded: ${consumedTokens} tokens used, hard cap is ${this.config.hardCap}`,
      }
    }

    return {
      withinBudget: true,
      usedTokens: consumedTokens,
      remainingTokens: remaining,
      maxIterationsLeft,
    }
  }

  consume(tokens: number): void {
    this.usedTokens += tokens
  }

  reset(): void {
    this.usedTokens = 0
  }

  getUsed(): number {
    return this.usedTokens
  }

  getCap(): number {
    return this.config.hardCap
  }
}
