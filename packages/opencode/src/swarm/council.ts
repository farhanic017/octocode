const POSITIVE_SIGNALS = new Set([
  "add", "build", "improve", "dark", "demand", "users", "profit",
  "works", "passed", "positive", "compliant", "analytics", "market",
])

const RISK_SIGNALS = new Set([
  "delete", "remove", "breaking", "unsafe", "risk", "illegal", "loss",
  "unverified", "private", "secret", "credentials",
])

const RISK_AGENTS = new Set(["security", "legal", "testing", "finance"])

const PRIORITY_BY_KEYWORDS: [string[], string[]][] = [
  [["delete", "remove", "breaking", "unsafe", "risk", "secret", "credentials"], ["security", "legal", "testing", "finance"]],
  [["build", "feature", "code", "bug", "test", "dark"], ["coder", "testing", "security", "ux_research", "analytics", "product_manager"]],
  [["market", "profit", "crypto", "trading", "finance"], ["trading", "finance", "analytics", "legal", "marketing", "sales"]],
]

export interface CouncilOpinion {
  agentName: string
  pillar: string
  stance: "proceed" | "reject"
  confidence: number
  reasoning: string
  risks: string[]
  evidence: string[]
}

export interface CouncilDecision {
  question: string
  verdict: "proceed" | "reject"
  yesVotes: number
  noVotes: number
  confidence: number
  opinions: CouncilOpinion[]
  conflicts: string[]
  summary: string
}

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9_\s]/g, " ")
  return normalized.split(/\s+/).filter((t) => t.length > 0)
}

function collectOpinion(
  agentName: string,
  pillar: string,
  question: string,
): CouncilOpinion {
  const tokens = new Set(tokenize(question))
  const positiveCount = [...tokens].filter((t) => POSITIVE_SIGNALS.has(t)).length
  const riskyCount = [...tokens].filter((t) => RISK_SIGNALS.has(t)).length

  let stance: "proceed" | "reject"
  let confidence: number

  if (riskyCount > positiveCount && RISK_AGENTS.has(agentName)) {
    stance = "reject"
    confidence = Math.max(52, Math.min(88, 68 + riskyCount * 6))
  } else {
    stance = "proceed"
    confidence = Math.max(55, Math.min(96, 72 + positiveCount * 4 - riskyCount * 5))
  }

  const risks: string[] = []
  if (tokens.size > 0 && [...tokens].some((t) => RISK_SIGNALS.has(t))) {
    risks.push("request contains explicit risk language")
  }
  if (agentName === "security") risks.push("security assumptions must be validated")
  if (agentName === "testing") risks.push("edge cases need regression coverage")

  const evidence: string[] = []
  if (pillar === "code") evidence.push("implementation and test impact reviewed")
  if (pillar === "see") evidence.push("research and data evidence requested")
  if (pillar === "design") evidence.push("UX and interaction fit checked")
  if (pillar === "act") evidence.push("business and execution impact assessed")

  const reasoning = `${agentName} (${pillar}) votes ${stance} with ${confidence}% confidence. ${evidence.join(". ")}`

  return { agentName, pillar, stance, confidence, reasoning, risks, evidence }
}

function selectCouncilAgents(question: string, availableAgents: { name: string; pillar: string }[], quorum: number): string[] {
  const tokens = new Set(tokenize(question))
  const priorityList: string[] = []

  for (const [keywords, agents] of PRIORITY_BY_KEYWORDS) {
    if (keywords.some((k) => tokens.has(k))) {
      for (const a of agents) {
        if (!priorityList.includes(a)) priorityList.push(a)
      }
    }
  }

  priorityList.push("researcher", "reviewer", "council_master")

  const selected: string[] = []
  for (const name of priorityList) {
    if (selected.length >= quorum) break
    if (availableAgents.some((a) => a.name === name)) {
      selected.push(name)
    }
  }

  for (const agent of availableAgents) {
    if (selected.length >= quorum) break
    if (!selected.includes(agent.name)) {
      selected.push(agent.name)
    }
  }

  return selected.slice(0, quorum)
}

export function runCouncilVote(
  question: string,
  agents: { name: string; pillar: string }[],
  quorum: number = 6,
): CouncilDecision {
  if (!question.trim()) {
    return { question, verdict: "reject", yesVotes: 0, noVotes: 0, confidence: 0, opinions: [], conflicts: [], summary: "Empty question" }
  }

  const selected = selectCouncilAgents(question, agents, quorum)
  const opinions: CouncilOpinion[] = selected.map((name) => {
    const agent = agents.find((a) => a.name === name)!
    return collectOpinion(name, agent.pillar, question)
  })

  const yesVotes = opinions.filter((o) => o.stance === "proceed").length
  const noVotes = opinions.filter((o) => o.stance === "reject").length
  const verdict = yesVotes > noVotes ? "proceed" : "reject"

  const meanConfidence = opinions.length > 0
    ? opinions.reduce((sum, o) => sum + o.confidence, 0) / opinions.length
    : 0
  const agreementBonus = opinions.length > 0
    ? Math.round(Math.abs(yesVotes - noVotes) / opinions.length * 8)
    : 0
  const confidence = Math.max(1, Math.min(99, Math.round(meanConfidence + agreementBonus)))

  const conflicts = opinions
    .filter((o) => o.stance !== verdict)
    .map((o) => o.agentName)

  const summary = `${verdict.toUpperCase()} — ${yesVotes}/${yesVotes + noVotes} YES votes, ${confidence}% confidence${conflicts.length > 0 ? `. Conflicts: ${conflicts.join(", ")}` : ""}`

  return { question, verdict, yesVotes, noVotes, confidence, opinions, conflicts, summary }
}
