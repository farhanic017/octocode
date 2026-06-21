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
    name: "teleport",
    description: "prepare a handoff summary for another interface",
    template: `
Create a compact handoff summary that can be pasted into another UI. Include current goal, relevant files, decisions, open risks, and the next concrete action.

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
    name: "plugin",
    description: "plan or inspect plugin setup",
    template: `
Inspect or plan plugin-related work for the current project. Identify installed plugin surfaces, likely config files, and the safest next steps for installing, configuring, or removing plugins.

$ARGUMENTS
`.trim(),
  },
  {
    name: "plugins",
    description: "list and reason about available plugin surfaces",
    template: `
List the plugin surfaces relevant to this project and explain how they affect commands, tools, auth, providers, UI, or hooks. Include concrete files or commands when available.

$ARGUMENTS
`.trim(),
  },
  {
    name: "reload-plugins",
    description: "reload or simulate plugin refresh steps",
    template: `
Determine how to refresh plugin state for this workspace. If a native reload action exists, use it or explain it. Otherwise list the minimum restart or config refresh steps needed.

$ARGUMENTS
`.trim(),
  },
  {
    name: "ide",
    description: "inspect IDE integration state",
    template: `
Inspect the current IDE/editor integration assumptions. Check for relevant environment variables, editor context, workspace files, and integration settings, then summarize what is connected and what is missing.

$ARGUMENTS
`.trim(),
  },
  {
    name: "terminal-setup",
    description: "review terminal integration and keybinding setup",
    template: `
Review terminal setup for this CLI workflow. Check shell, OS, keybinding, multiline-input, clipboard, and terminal capability assumptions where possible. Recommend concrete fixes.

$ARGUMENTS
`.trim(),
  },
  {
    name: "remote-control",
    description: "plan authenticated remote control setup",
    template: `
Plan a remote-control setup for the active workspace. Cover authentication, network exposure, allowed commands, lifecycle, logging, and rollback. Do not open listeners unless explicitly requested.

$ARGUMENTS
`.trim(),
  },
  {
    name: "remote-env",
    description: "review environment variables for remote runners",
    template: `
Review the environment variables and secrets needed for a remote or headless runner. Identify required values, sensitive values, and a safe way to configure them.

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
    name: "install-github-app",
    description: "plan GitHub app or repository integration",
    template: `
Plan GitHub app integration for this repository. Identify permissions, token flow, repository settings, workflow changes, and security risks. Do not install or authorize anything unless explicitly requested.

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
    name: "usage",
    description: "summarize usage, quotas, and limits when available",
    template: `
Report usage, quota, or limit information relevant to the current project and CLI session when available. If live account usage is unavailable, state that and summarize local observable usage signals.

$ARGUMENTS
`.trim(),
  },
  {
    name: "stats",
    description: "summarize project or session activity statistics",
    template: `
Gather useful local statistics for the current project or session, such as changed files, commit activity, test counts, command frequency if available, and code areas touched.

$ARGUMENTS
`.trim(),
  },
  {
    name: "insights",
    description: "produce engineering insights from recent work",
    template: `
Analyze recent work and produce engineering insights: recurring bug patterns, review delays, risky modules, refactor opportunities, and practical next actions.

$ARGUMENTS
`.trim(),
  },
  {
    name: "extra-usage",
    description: "plan guardrails for high-usage work",
    template: `
Plan usage guardrails for a high-demand task. Identify expensive steps, cheaper alternatives, stopping points, and what information should be gathered before spending more compute.

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
    name: "release-notes",
    description: "summarize release notes or local changelog impact",
    template: `
Summarize release notes or changelog impact for the current project. Prefer user-facing changes, compatibility risks, migration notes, and verification steps.

$ARGUMENTS
`.trim(),
  },
  {
    name: "upgrade",
    description: "plan a safe dependency or CLI upgrade",
    template: `
Plan a safe upgrade. Identify the target package/tool/version, compatibility risks, required commands, tests, rollback path, and files likely to change. Do not upgrade unless explicitly requested.

$ARGUMENTS
`.trim(),
  },
  {
    name: "feedback",
    description: "package a clear bug report or feedback note",
    template: `
Prepare a concise feedback or bug report from the current context. Include expected behavior, actual behavior, reproduction steps, environment, logs, and suggested severity.

$ARGUMENTS
`.trim(),
  },
  {
    name: "passes",
    description: "prepare external access or review pass instructions",
    template: `
Prepare instructions for granting temporary external access or review passes. Cover scope, expiration, permissions, auditability, and revocation. Do not create credentials unless explicitly requested.

$ARGUMENTS
`.trim(),
  },
  {
    name: "stickers",
    description: "prepare a terminal profile or swag request",
    template: `
Prepare a short profile or request note for stickers or swag. If this needs an external portal, say so and provide the information to submit manually.

$ARGUMENTS
`.trim(),
  },
  {
    name: "mobile",
    description: "plan mobile companion setup",
    template: `
Plan mobile companion setup for this CLI/workspace. Include authentication, QR/deep-link expectations, synced state, security risks, and fallback manual steps.

$ARGUMENTS
`.trim(),
  },
  {
    name: "ios",
    description: "plan iOS companion setup",
    template: `
Plan iOS companion setup for this CLI/workspace. Include authentication, QR/deep-link expectations, synced state, security risks, and fallback manual steps.

$ARGUMENTS
`.trim(),
  },
  {
    name: "android",
    description: "plan Android companion setup",
    template: `
Plan Android companion setup for this CLI/workspace. Include authentication, QR/deep-link expectations, synced state, security risks, and fallback manual steps.

$ARGUMENTS
`.trim(),
  },
  {
    name: "vim",
    description: "review Vim mode or modal editing setup",
    template: `
Review Vim/modal editing setup for this terminal workflow. Identify current support, configuration files, keybinding conflicts, and implementation steps if native support is missing.

$ARGUMENTS
`.trim(),
  },
  {
    name: "color",
    description: "propose prompt and accent color settings",
    template: `
Propose color settings for the current CLI/TUI design. Respect the existing design system, accessibility, contrast, and terminal limitations.

$ARGUMENTS
`.trim(),
  },
  {
    name: "statusline",
    description: "design or inspect statusline content",
    template: `
Inspect or design the statusline for this CLI. Recommend what should be shown, hidden, or moved, including branch, model, agent, cost, usage, and active task state.

$ARGUMENTS
`.trim(),
  },
  {
    name: "output-style",
    description: "adjust response format and verbosity",
    template: `
Use the requested output style for the next response. If no style is specified, recommend a style based on the task. Keep code and command output readable.

$ARGUMENTS
`.trim(),
  },
  {
    name: "voice",
    description: "plan voice input support",
    template: `
Plan voice input support for this terminal workflow. Cover capture, push-to-talk, transcription provider, privacy, latency, UI states, and fallback keyboard behavior.

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
    name: "claude-api",
    description: "design or run raw model API experiments",
    template: `
Design or run a raw model/API experiment for the request below. Keep workspace file tools out of scope unless explicitly needed. Capture inputs, outputs, parameters, and conclusions.

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
    name: "run-skill-generator",
    description: "generate project-specific run command ideas",
    template: `
Analyze the project structure and generate useful project-specific /run command templates. Include command names, when to use them, exact shell commands, and safety notes.

$ARGUMENTS
`.trim(),
  },
  {
    name: "hooks",
    description: "inspect or design automation hooks",
    template: `
Inspect or design event-driven automation hooks for this project. Cover trigger, action, scope, failure behavior, logging, and how to disable or roll back each hook.

$ARGUMENTS
`.trim(),
  },
  {
    name: "start-work",
    description: "start work from the project agent blueprint",
    subtask: true,
    template: `
Start work from the project's agent blueprint or AGENTS.md instructions. Read the relevant guidance, derive the next tasks, and begin with the highest-impact safe action.

$ARGUMENTS
`.trim(),
  },
  {
    name: "ulw",
    description: "deep reasoning pass for complex architecture or logic",
    subtask: true,
    template: `
Use a deep reasoning pass for this request. Inspect architecture and logic carefully, identify hidden constraints, and produce a robust implementation or plan with verification.

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
].map((command) => ({
  ...command,
  template: `${command.template}\n\n${workspaceContext}`,
}))
