export type Pillar = "code" | "see" | "design" | "act"

export type AgentCategory =
  | "core"
  | "coding"
  | "creative"
  | "business"
  | "councils"
  | "integrations"
  | "observability"

export interface SwarmAgentSpec {
  name: string
  pillar: Pillar
  category: AgentCategory
  description: string
  capabilities: string[]
  tools: string[]
  temperature: number
  modelPreference: string
  subAgentRoles: string[]
}

const CODE_TOOLS = ["read", "write", "edit", "bash", "glob", "grep"]
const RESEARCH_TOOLS = ["read", "glob", "grep", "webfetch", "websearch"]
const DOC_TOOLS = ["read", "write", "glob"]
const REVIEW_TOOLS = ["read", "grep", "glob"]
const BROWSER_TOOLS = ["webfetch", "websearch", "bash"]
const WORKFLOW_TOOLS = ["read", "write", "edit", "bash", "glob", "grep", "actor"]

export const SWARM_AGENTS: SwarmAgentSpec[] = [
  // ── Core ──
  { name: "triage", pillar: "act", category: "core", description: "Routes tasks to the right specialist agents based on task analysis", capabilities: ["task-routing", "priority-assessment"], tools: [], temperature: 0.2, modelPreference: "reasoning", subAgentRoles: ["researcher", "coder", "reviewer"] },
  { name: "researcher", pillar: "see", category: "core", description: "Performs deep research, analysis, and information gathering", capabilities: ["web-search", "code-analysis", "data-extraction"], tools: RESEARCH_TOOLS, temperature: 0.3, modelPreference: "auto", subAgentRoles: [] },
  { name: "coder", pillar: "code", category: "coding", description: "Writes, modifies, and debugs code across any language", capabilities: ["code-generation", "bug-fixing", "refactoring"], tools: CODE_TOOLS, temperature: 0.2, modelPreference: "coding", subAgentRoles: ["testing", "reviewer"] },
  { name: "backend_api", pillar: "code", category: "coding", description: "Designs and implements backend services, APIs, and database schemas", capabilities: ["api-design", "database", "server-logic"], tools: CODE_TOOLS, temperature: 0.2, modelPreference: "coding", subAgentRoles: ["testing"] },
  { name: "frontend_ui", pillar: "code", category: "coding", description: "Builds user interfaces, components, and responsive layouts", capabilities: ["ui-components", "responsive-design", "accessibility"], tools: CODE_TOOLS, temperature: 0.25, modelPreference: "coding", subAgentRoles: ["testing", "reviewer"] },
  { name: "testing", pillar: "code", category: "coding", description: "Writes and runs tests, validates code quality and coverage", capabilities: ["unit-testing", "integration-testing", "coverage-analysis"], tools: CODE_TOOLS, temperature: 0.15, modelPreference: "coding", subAgentRoles: [] },
  { name: "security", pillar: "code", category: "coding", description: "Audits code for vulnerabilities, hardcoded secrets, and unsafe patterns", capabilities: ["vulnerability-scan", "secret-detection", "xss-prevention"], tools: REVIEW_TOOLS, temperature: 0.1, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "reviewer", pillar: "code", category: "coding", description: "Performs code review with focus on quality, patterns, and best practices", capabilities: ["code-review", "pattern-detection", "best-practices"], tools: REVIEW_TOOLS, temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "ai_reviewer", pillar: "code", category: "coding", description: "AI-powered review for logic, architecture, and performance issues", capabilities: ["logic-review", "performance-analysis", "architecture-review"], tools: REVIEW_TOOLS, temperature: 0.15, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "debugging", pillar: "code", category: "coding", description: "Systematic debugging with hypothesis testing and root cause analysis", capabilities: ["hypothesis-testing", "root-cause-analysis", "error-tracing"], tools: CODE_TOOLS, temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "test_generator", pillar: "code", category: "coding", description: "Generates comprehensive test suites for existing code", capabilities: ["test-generation", "edge-case-coverage", "mock-creation"], tools: CODE_TOOLS, temperature: 0.15, modelPreference: "coding", subAgentRoles: [] },
  { name: "migration_agent", pillar: "code", category: "coding", description: "Handles database migrations, schema changes, and data transformations", capabilities: ["schema-migration", "data-transform", "rollback-planning"], tools: CODE_TOOLS, temperature: 0.15, modelPreference: "coding", subAgentRoles: ["testing"] },
  { name: "dependency_auditor", pillar: "code", category: "coding", description: "Audits dependencies for vulnerabilities, outdated packages, and license compliance", capabilities: ["dependency-audit", "license-check", "version-analysis"], tools: REVIEW_TOOLS, temperature: 0.1, modelPreference: "auto", subAgentRoles: [] },
  { name: "code_explainer", pillar: "code", category: "coding", description: "Explains code architecture, data flows, and complex logic in detail", capabilities: ["code-explanation", "architecture-mapping", "data-flow-tracing"], tools: DOC_TOOLS, temperature: 0.3, modelPreference: "chat", subAgentRoles: [] },
  { name: "refactor_planner", pillar: "code", category: "coding", description: "Plans safe refactoring steps with dependency analysis", capabilities: ["refactoring-planning", "dependency-analysis", "risk-assessment"], tools: REVIEW_TOOLS, temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "ci_cd_generator", pillar: "code", category: "coding", description: "Creates CI/CD pipelines, GitHub Actions workflows, and deployment configs", capabilities: ["pipeline-generation", "workflow-creation", "deployment-config"], tools: CODE_TOOLS, temperature: 0.2, modelPreference: "coding", subAgentRoles: [] },
  { name: "playwright_controller", pillar: "see", category: "coding", description: "Controls Playwright for browser automation and E2E testing", capabilities: ["browser-automation", "e2e-testing", "screenshot-capture"], tools: BROWSER_TOOLS, temperature: 0.15, modelPreference: "coding", subAgentRoles: [] },
  { name: "api_explorer", pillar: "see", category: "coding", description: "Discovers and documents API endpoints through exploration", capabilities: ["api-discovery", "endpoint-documentation", "request-testing"], tools: BROWSER_TOOLS, temperature: 0.2, modelPreference: "auto", subAgentRoles: [] },
  { name: "link_validator", pillar: "see", category: "coding", description: "Validates links, URLs, and references across the codebase", capabilities: ["link-checking", "url-validation", "reference-tracking"], tools: BROWSER_TOOLS, temperature: 0.1, modelPreference: "auto", subAgentRoles: [] },
  { name: "secret_scanner", pillar: "code", category: "coding", description: "Scans codebase for hardcoded secrets, API keys, and credentials", capabilities: ["secret-detection", "credential-scanning", "env-var-audit"], tools: REVIEW_TOOLS, temperature: 0.1, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "diff_reviewer", pillar: "code", category: "coding", description: "Reviews git diffs for quality, security, and completeness", capabilities: ["diff-analysis", "change-review", "regression-detection"], tools: REVIEW_TOOLS, temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "supabase_agent", pillar: "code", category: "coding", description: "Manages Supabase databases, auth, RLS policies, and edge functions", capabilities: ["database-management", "auth-config", "rls-policies"], tools: CODE_TOOLS, temperature: 0.2, modelPreference: "coding", subAgentRoles: ["testing"] },
  { name: "app_builder", pillar: "code", category: "coding", description: "Builds full-stack applications from specifications", capabilities: ["fullstack-building", "architecture-design", "component-creation"], tools: WORKFLOW_TOOLS, temperature: 0.25, modelPreference: "coding", subAgentRoles: ["coder", "testing", "reviewer"] },
  { name: "app_tester", pillar: "code", category: "coding", description: "Tests applications end-to-end, validates functionality", capabilities: ["e2e-testing", "functional-validation", "regression-testing"], tools: BROWSER_TOOLS, temperature: 0.15, modelPreference: "coding", subAgentRoles: [] },
  { name: "typescript_sdk", pillar: "code", category: "coding", description: "Creates and maintains TypeScript SDKs and type definitions", capabilities: ["sdk-generation", "type-safety", "api-client-creation"], tools: CODE_TOOLS, temperature: 0.2, modelPreference: "coding", subAgentRoles: ["testing"] },

  // ── See (Research & Vision) ──
  { name: "analytics", pillar: "see", category: "business", description: "Performs data analysis, generates insights, and creates visualizations", capabilities: ["data-analysis", "insight-generation", "visualization"], tools: RESEARCH_TOOLS, temperature: 0.3, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "ux_research", pillar: "see", category: "business", description: "Researches user experience patterns, usability, and accessibility", capabilities: ["ux-audit", "accessibility-check", "usability-analysis"], tools: REVIEW_TOOLS, temperature: 0.25, modelPreference: "auto", subAgentRoles: [] },
  { name: "prediction", pillar: "see", category: "business", description: "Makes predictions and forecasts based on data and patterns", capabilities: ["forecasting", "trend-analysis", "risk-prediction"], tools: RESEARCH_TOOLS, temperature: 0.3, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "financial_researcher", pillar: "see", category: "business", description: "Researches financial data, market trends, and investment opportunities", capabilities: ["financial-analysis", "market-research", "investment-analysis"], tools: RESEARCH_TOOLS, temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "competitor_analysis", pillar: "see", category: "business", description: "Analyzes competitors, market positioning, and competitive advantages", capabilities: ["competitor-research", "market-positioning", "gap-analysis"], tools: RESEARCH_TOOLS, temperature: 0.25, modelPreference: "auto", subAgentRoles: [] },
  { name: "seo_audit", pillar: "see", category: "business", description: "Audits SEO health, keyword opportunities, and technical SEO issues", capabilities: ["seo-audit", "keyword-research", "technical-seo"], tools: BROWSER_TOOLS, temperature: 0.2, modelPreference: "auto", subAgentRoles: [] },

  // ── Design (Creative) ──
  { name: "writer", pillar: "design", category: "creative", description: "Writes technical documentation, blog posts, and marketing copy", capabilities: ["technical-writing", "blog-writing", "copywriting"], tools: DOC_TOOLS, temperature: 0.4, modelPreference: "chat", subAgentRoles: [] },
  { name: "documentation", pillar: "design", category: "creative", description: "Creates and maintains project documentation, READMEs, and API docs", capabilities: ["doc-generation", "api-docs", "readme-creation"], tools: DOC_TOOLS, temperature: 0.3, modelPreference: "chat", subAgentRoles: [] },
  { name: "text_editor", pillar: "design", category: "creative", description: "Edits and polishes text for clarity, grammar, and tone", capabilities: ["text-editing", "grammar-check", "tone-adjustment"], tools: DOC_TOOLS, temperature: 0.3, modelPreference: "chat", subAgentRoles: [] },
  { name: "prompt_generator", pillar: "design", category: "creative", description: "Creates optimized prompts for AI tools and LLMs", capabilities: ["prompt-engineering", "template-creation", "llm-optimization"], tools: DOC_TOOLS, temperature: 0.35, modelPreference: "chat", subAgentRoles: [] },
  { name: "design", pillar: "design", category: "creative", description: "Creates UI/UX designs, wireframes, and visual specifications", capabilities: ["ui-design", "wireframing", "visual-specs"], tools: DOC_TOOLS, temperature: 0.35, modelPreference: "chat", subAgentRoles: [] },
  { name: "brand_consistency", pillar: "design", category: "creative", description: "Ensures brand consistency across all outputs and materials", capabilities: ["brand-audit", "consistency-check", "style-enforcement"], tools: REVIEW_TOOLS, temperature: 0.2, modelPreference: "auto", subAgentRoles: [] },
  { name: "storyboard", pillar: "design", category: "creative", description: "Creates storyboards for animations, videos, and interactive experiences", capabilities: ["storyboard-creation", "scene-planning", "narrative-design"], tools: DOC_TOOLS, temperature: 0.35, modelPreference: "chat", subAgentRoles: [] },

  // ── Act (Business & Execution) ──
  { name: "marketing", pillar: "act", category: "business", description: "Creates marketing strategies, campaigns, and content plans", capabilities: ["strategy-creation", "campaign-planning", "content-strategy"], tools: RESEARCH_TOOLS, temperature: 0.35, modelPreference: "chat", subAgentRoles: [] },
  { name: "finance", pillar: "act", category: "business", description: "Handles financial analysis, budgeting, and cost optimization", capabilities: ["financial-analysis", "budgeting", "cost-optimization"], tools: RESEARCH_TOOLS, temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "trading", pillar: "act", category: "business", description: "Analyzes trading strategies, market signals, and portfolio optimization", capabilities: ["trading-analysis", "signal-detection", "portfolio-optimization"], tools: RESEARCH_TOOLS, temperature: 0.15, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "legal", pillar: "act", category: "business", description: "Reviews legal aspects, compliance, and licensing requirements", capabilities: ["legal-review", "compliance-check", "license-analysis"], tools: REVIEW_TOOLS, temperature: 0.15, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "product_manager", pillar: "act", category: "business", description: "Manages product roadmap, priorities, and feature specifications", capabilities: ["roadmap-planning", "priority-setting", "feature-specs"], tools: RESEARCH_TOOLS, temperature: 0.25, modelPreference: "reasoning", subAgentRoles: ["researcher", "coder"] },
  { name: "sales", pillar: "act", category: "business", description: "Creates sales strategies, pitches, and customer outreach plans", capabilities: ["pitch-creation", "customer-analysis", "outreach-planning"], tools: DOC_TOOLS, temperature: 0.35, modelPreference: "chat", subAgentRoles: [] },
  { name: "localization", pillar: "act", category: "business", description: "Handles internationalization, translations, and locale-specific content", capabilities: ["translation", "i18n", "locale-adaptation"], tools: DOC_TOOLS, temperature: 0.3, modelPreference: "chat", subAgentRoles: [] },
  { name: "analytics_interpreter", pillar: "act", category: "business", description: "Interprets analytics data and generates actionable recommendations", capabilities: ["analytics-interpretation", "recommendation-generation", "trend-detection"], tools: RESEARCH_TOOLS, temperature: 0.25, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "email_campaign", pillar: "act", category: "business", description: "Creates email marketing campaigns and automation sequences", capabilities: ["email-creation", "campaign-automation", "a-b-testing"], tools: DOC_TOOLS, temperature: 0.35, modelPreference: "chat", subAgentRoles: [] },
  { name: "invoice_contract", pillar: "act", category: "business", description: "Generates invoices, contracts, and business documents", capabilities: ["invoice-generation", "contract-creation", "document-formatting"], tools: DOC_TOOLS, temperature: 0.2, modelPreference: "chat", subAgentRoles: [] },
  { name: "pitch_deck", pillar: "act", category: "business", description: "Creates pitch decks and investor presentations", capabilities: ["pitch-creation", "deck-design", "investor-presentation"], tools: DOC_TOOLS, temperature: 0.35, modelPreference: "chat", subAgentRoles: [] },
  { name: "social_media_manager", pillar: "act", category: "business", description: "Manages social media content, scheduling, and engagement", capabilities: ["content-scheduling", "engagement-tracking", "social-strategy"], tools: DOC_TOOLS, temperature: 0.35, modelPreference: "chat", subAgentRoles: [] },
  { name: "job_finder", pillar: "act", category: "business", description: "Searches for job opportunities and creates tailored applications", capabilities: ["job-search", "resume-tailoring", "application-generation"], tools: BROWSER_TOOLS, temperature: 0.25, modelPreference: "auto", subAgentRoles: [] },
  { name: "form_filler", pillar: "act", category: "integrations", description: "Automates form filling and data entry tasks", capabilities: ["form-automation", "data-entry", "browser-interaction"], tools: BROWSER_TOOLS, temperature: 0.15, modelPreference: "auto", subAgentRoles: [] },

  // ── Councils ──
  { name: "council_master", pillar: "act", category: "councils", description: "Coordinates council voting and manages decision-making processes", capabilities: ["vote-coordination", "decision-management"], tools: [], temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "design_council", pillar: "design", category: "councils", description: "Reviews design decisions for consistency and quality", capabilities: ["design-review", "consistency-check"], tools: [], temperature: 0.25, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "finance_council", pillar: "act", category: "councils", description: "Reviews financial decisions and budget implications", capabilities: ["financial-review", "budget-analysis"], tools: [], temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },
  { name: "marketing_council", pillar: "act", category: "councils", description: "Reviews marketing decisions and campaign effectiveness", capabilities: ["marketing-review", "campaign-analysis"], tools: [], temperature: 0.25, modelPreference: "reasoning", subAgentRoles: [] },

  // ── Observability ──
  { name: "telemetry_tracer", pillar: "see", category: "observability", description: "Traces application telemetry and performance metrics", capabilities: ["telemetry-tracing", "performance-metrics", "bottleneck-detection"], tools: REVIEW_TOOLS, temperature: 0.2, modelPreference: "auto", subAgentRoles: [] },
  { name: "cost_dashboard", pillar: "see", category: "observability", description: "Monitors and reports on AI usage costs and token consumption", capabilities: ["cost-tracking", "token-monitoring", "budget-reporting"], tools: [], temperature: 0.15, modelPreference: "auto", subAgentRoles: [] },
  { name: "performance_leaderboard", pillar: "see", category: "observability", description: "Tracks and ranks agent and model performance", capabilities: ["performance-tracking", "ranking", "benchmarking"], tools: [], temperature: 0.15, modelPreference: "auto", subAgentRoles: [] },
  { name: "anomaly_detector", pillar: "see", category: "observability", description: "Detects anomalies in system behavior and agent outputs", capabilities: ["anomaly-detection", "pattern-analysis", "alert-generation"], tools: REVIEW_TOOLS, temperature: 0.2, modelPreference: "reasoning", subAgentRoles: [] },

  // ── Integrations ──
  { name: "n8n_workflow_creator", pillar: "act", category: "integrations", description: "Creates n8n automation workflows for task automation", capabilities: ["workflow-creation", "automation-design", "integration-setup"], tools: WORKFLOW_TOOLS, temperature: 0.25, modelPreference: "coding", subAgentRoles: [] },
  { name: "site_monitor", pillar: "see", category: "integrations", description: "Monitors website uptime, performance, and SSL certificates", capabilities: ["uptime-monitoring", "performance-checking", "ssl-validation"], tools: BROWSER_TOOLS, temperature: 0.15, modelPreference: "auto", subAgentRoles: [] },
  { name: "web_scraper", pillar: "see", category: "integrations", description: "Scrapes and extracts data from websites and APIs", capabilities: ["web-scraping", "data-extraction", "api-parsing"], tools: BROWSER_TOOLS, temperature: 0.2, modelPreference: "auto", subAgentRoles: [] },
]

export function buildFromSpec(spec: SwarmAgentSpec): {
  name: string
  description: string
  mode: "subagent"
  toolAllowlist: string[]
  temperature: number
  options: Record<string, unknown>
  permission: unknown[]
} {
  return {
    name: spec.name,
    description: spec.description,
    mode: "subagent" as const,
    toolAllowlist: spec.tools,
    temperature: spec.temperature,
    options: {
      pillar: spec.pillar,
      category: spec.category,
      capabilities: spec.capabilities,
      modelPreference: spec.modelPreference,
      subAgentRoles: spec.subAgentRoles,
    },
    permission: [],
  }
}

export const SWARM_PILLARS: Record<Pillar, string> = {
  code: "Implementation, testing, security, and code quality",
  see: "Research, analytics, vision, and data gathering",
  design: "Creative work, writing, UI/UX design, and media",
  act: "Business, orchestration, execution, and decision-making",
}
