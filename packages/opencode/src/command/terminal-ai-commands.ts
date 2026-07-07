type BuiltinCommand = {
  name: string
  description: string
  template: string
  subtask?: boolean
}

const workspaceContext = `
Use the available project context and tools. If the requested behavior needs a native UI, account, billing, browser, IDE, remote runner, or daemon integration that is not available from this prompt command, explain the limitation clearly and provide the closest actionable result.
`.trim()

export const TerminalAICommands: BuiltinCommand[] = [
  {
    name: "btw",
    description: "run an isolated side prompt without changing the main task",
    template: `
Treat this as a by-the-way side request. Answer the user request below independently from the active implementation plan, avoid making file changes unless explicitly asked, and keep the response concise.

$ARGUMENTS
`.trim(),
  },
  {
    name: "rewind",
    description: "review recent changes and propose a safe rollback point",
    template: `
Inspect the recent conversation context, git status, and available diffs. Identify the safest rollback options for the user's request, including what files or commands would be affected. Do not revert anything unless explicitly instructed.

$ARGUMENTS
`.trim(),
  },
  {
    name: "add-dir",
    description: "assess adding an external directory to the workspace context",
    template: `
Evaluate this external directory request. Verify the path if provided, explain what context it would add, and recommend the least risky way to include it in the current workspace flow. Do not make broad file changes.

Directory or request:
$ARGUMENTS
`.trim(),
  },
  {
    name: "sandbox",
    description: "review filesystem and command sandbox expectations",
    template: `
Review the current sandbox, filesystem, and command-execution assumptions for this task. Explain what operations are safe, what needs confirmation, and what should be avoided.

$ARGUMENTS
`.trim(),
  },
  {
    name: "permissions",
    description: "audit tool and command permission boundaries",
    template: `
Audit the permission boundaries relevant to the current task. Identify commands or file operations that may need approval, dangerous patterns to avoid, and safer alternatives.

$ARGUMENTS
`.trim(),
  },
  {
    name: "chrome",
    description: "plan browser automation or visual QA",
    template: `
Plan or run browser/Chromium-based inspection for the current UI task when tools are available. Focus on screenshots, DOM state, console errors, network errors, and concrete regressions.

$ARGUMENTS
`.trim(),
  },
  {
    name: "fast",
    description: "handle a request with low-latency constraints",
    template: `
Handle this in fast mode. Prefer the simplest reliable answer or edit, avoid broad exploration, and call out any shortcuts or residual risk.

$ARGUMENTS
`.trim(),
  },
  {
    name: "plan",
    description: "create an implementation plan without editing files",
    template: `
Create a concrete implementation plan for the request below. Do not edit files. Include the files likely to change, major risks, and verification steps.

$ARGUMENTS
`.trim(),
  },
  {
    name: "todos",
    description: "scan workspace TODO, FIXME, and HACK comments",
    template: `
Scan the current workspace for TODO, FIXME, HACK, and similar follow-up markers. Summarize them by area, priority, and whether they are relevant to the current task.

$ARGUMENTS
`.trim(),
  },
  {
    name: "context",
    description: "summarize active context and token pressure",
    template: `
Summarize the active task context: current goal, relevant files, important decisions, unknowns, and likely context-window pressure. Keep it actionable.

$ARGUMENTS
`.trim(),
  },
  {
    name: "cost",
    description: "estimate cost and resource impact",
    template: `
Estimate the cost and resource impact of the current task using available information. Include likely model/tool usage drivers and practical ways to reduce unnecessary work.

$ARGUMENTS
`.trim(),
  },
  {
    name: "doctor",
    description: "run a local environment diagnostic pass",
    template: `
Run a diagnostic pass for the local development environment. Check relevant runtimes, package managers, git state, config, permissions, network assumptions, and likely blockers.

$ARGUMENTS
`.trim(),
  },
  {
    name: "code-review",
    description: "review code changes for bugs and regressions",
    subtask: true,
    template: `
Review the current code changes with a bug-finding stance. Prioritize correctness, regressions, security, accessibility, missing tests, and maintainability. Report findings first with file references, then summarize.

$ARGUMENTS
`.trim(),
  },
  {
    name: "simplify",
    description: "simplify code while preserving behavior",
    subtask: true,
    template: `
Find opportunities to simplify the requested code or recent changes while preserving behavior. Prefer removing unnecessary complexity over broad refactors. Explain and implement only safe improvements.

$ARGUMENTS
`.trim(),
  },
  {
    name: "security-review",
    description: "scan for security risks and secret exposure",
    subtask: true,
    template: `
Perform a security review. Look for secret leaks, injection paths, unsafe filesystem or shell behavior, auth issues, dependency risk, and permission boundary mistakes. Report concrete findings first.

$ARGUMENTS
`.trim(),
  },
  {
    name: "debug",
    description: "debug failing commands, tests, or runtime errors",
    subtask: true,
    template: `
Debug the failure described below. Reproduce when possible, inspect logs and relevant code, identify root cause, implement a minimal fix if appropriate, and verify it.

$ARGUMENTS
`.trim(),
  },
  {
    name: "loop",
    description: "run an iterative fix and verify loop",
    subtask: true,
    template: `
Run an iterative implementation loop for the request below: make a focused change, run the relevant verification, inspect failures, and repeat until handled or clearly blocked. Keep changes scoped.

$ARGUMENTS
`.trim(),
  },
  {
    name: "batch",
    description: "plan and execute structured multi-file edits",
    subtask: true,
    template: `
Plan a structured batch of related edits for the request below. Group changes by file or subsystem, apply them in a safe order, and verify the result.

$ARGUMENTS
`.trim(),
  },
  {
    name: "run",
    description: "run build, test, or compile checks and diagnose failures",
    subtask: true,
    template: `
Run the requested build, test, compile, or verification command. If it fails, diagnose the failure and recommend or implement a minimal fix when appropriate.

$ARGUMENTS
`.trim(),
  },
  {
    name: "verify",
    description: "verify recent changes with lightweight checks",
    subtask: true,
    template: `
Verify the recent change or requested behavior with the lightest meaningful checks. Prefer targeted tests, typechecks, lint, screenshots, or smoke tests. Report exactly what passed or failed.

$ARGUMENTS
`.trim(),
  },
  {
    name: "refactor",
    description: "refactor targeted code for clarity and structure",
    subtask: true,
    template: `
Refactor the target code for clarity, maintainability, and pattern consistency while preserving behavior. Keep the scope tight and run appropriate verification.

$ARGUMENTS
`.trim(),
  },
  {
    name: "dream",
    description: "review historical sessions and consolidate into long-term memory",
    template: `
Review your historical sessions from the past week. Deduplicate redundant information, compress key learnings, and consolidate insights into long-term memory patterns. Focus on:
- Recurring problems and their solutions
- User preferences and workflow patterns
- Successful approaches that should be reused
- Common errors and how to avoid them

Write a summary of consolidated learnings to .octocode/memory/ with dated entries. Remove duplicates and merge similar insights.

$ARGUMENTS
`.trim(),
  },
  {
    name: "distill",
    description: "mine past sessions to create reusable skills and patterns",
    template: `
Analyze your past successful sessions to identify repeated workflows and patterns. Extract these into automated skills:
- Look for sequences of actions that appear multiple times
- Identify task patterns that could be templated
- Create skill definitions for recurring workflows
- Document the trigger conditions and expected outcomes

For each pattern found:
1. Name it descriptively
2. Define when it should be triggered
3. List the concrete steps
4. Add safety notes

Write new skills to .octocode/skills/ as SKILL.md files with proper frontmatter.

$ARGUMENTS
`.trim(),
  },
  {
    name: "goal",
    description: "set a stopping condition for autonomous completion",
    subtask: true,
    template: `
Set a clear stopping condition for autonomous work. Define:
1. The specific goal state (e.g., "all tests pass", "PR is ready", "feature is complete")
2. Success criteria that must be met before stopping
3. Verification steps to confirm completion
4. Rollback plan if the goal cannot be achieved

Work autonomously toward this goal. Do not stop until:
- The stopping condition is truly met
- All verification steps pass
- You can demonstrate the goal state

If blocked, explain what's preventing progress and what would need to change.

Goal: $ARGUMENTS
`.trim(),
  },
  {
    name: "memory",
    description: "view or search persistent memory",
    template: `
Search and view your persistent memory across sessions.

Use the memory tool to:
- Search for relevant past experiences
- View recent checkpoints
- Add new memories

Query: $ARGUMENTS
`.trim(),
  },
  {
    name: "connect",
    description: "connect a new LLM provider",
    template: `
Connect a new LLM provider. Guide the user through selecting a provider, entering API keys, and verifying the connection works.

Provider or request:
$ARGUMENTS
`.trim(),
  },
  {
    name: "login",
    description: "sign in to your OctoCode account",
    template: `
Sign in to your OctoCode account for Token Plan access or to sync settings across devices.

$ARGUMENTS
`.trim(),
  },
  {
    name: "md",
    description: "create or update a .md session summary for Obsidian vault",
    template: `
Generate a comprehensive Markdown summary of the current session and save it to the configured Obsidian vault path using the \`write\` tool.

## Steps:
1. Check if a Brain Vault path is configured in the system prompt (look for "## Brain Vault")
2. If configured, create the file at: <vault_path>/OctoCode/Sessions/<descriptive-name>.md
3. Use a descriptive filename based on the first user message or conversation topic (e.g. "fix-auth-bug.md", "add-dark-mode.md")
4. If no vault is configured, ask the user to set one via the Brain dialog first

The \`write\` tool creates the file if it doesn't exist, or OVERWRITES it if it does.

## Include:
1. Session overview (model, agent, timestamps, directory)
2. Token usage breakdown
3. Summary of what was accomplished
4. Key decisions made
5. Files changed list
6. Any follow-up items or TODOs

$ARGUMENTS
`.trim(),
  },
  {
    name: "understand",
    description: "analyze and remember a codebase, file, plan, design, or package",
    subtask: true,
    template: `
Analyze the provided codebase, file, plan, design, or package and create a persistent knowledge graph that agents can reference across sessions.

## What to analyze:
- **Codebase**: scan all files, understand architecture, dependencies, patterns, entry points
- **Single file**: understand purpose, exports, imports, dependencies, patterns used
- **Plan/Design document**: extract goals, architecture decisions, components, interfaces
- **Package/Module**: understand public API, dependencies, internal structure

## Steps:
1. Read and understand the target thoroughly
2. Extract: purpose, structure, dependencies, key patterns, entry points, exports
3. Create/update the knowledge graph at \`.understand-anything/knowledge-graph.json\`
4. Create/update metadata at \`.understand-anything/meta.json\`
5. Create \`.understand-anything/.understandignore\` if it doesn't exist

## Knowledge Graph Format:
\`\`\`json
{
  "version": "1.0.0",
  "project": {
    "name": "<project-name>",
    "languages": ["typescript", "javascript", ...],
    "frameworks": ["solidjs", "hono", ...],
    "description": "<brief description>",
    "analyzedAt": "<ISO timestamp>",
    "gitCommitHash": "<current commit>"
  },
  "nodes": [
    {
      "id": "<type>:<path>",
      "type": "service|component|util|config|test|schema",
      "name": "<display name>",
      "filePath": "<relative path>",
      "summary": "<one-line description>",
      "tags": ["tag1", "tag2"],
      "complexity": "simple|moderate|complex"
    }
  ],
  "edges": [
    {
      "source": "<source node id>",
      "target": "<target node id>",
      "type": "imports|uses|extends|implements|calls",
      "description": "<relationship description>"
    }
  ]
}
\`\`\`

## Important:
- Store the knowledge graph in the WORKSPACE root at \`.understand-anything/\`
- The graph persists across sessions — agents can read it anytime
- When users mention analyzed components, agents can reference the graph
- Update existing graphs rather than overwriting — merge new insights

Target to analyze: $ARGUMENTS
`.trim(),
  },
].map((command) => ({
  ...command,
  template: `${command.template}\n\n${workspaceContext}`,
}))
