# Changelog

All notable changes to OctoCode are documented here.

## [3.1.2] — 2026-06-30

### New
- **Personality** — Trash talks other CLIs, roasts users, no language restrictions
- **User profiling** — Learns preferences, style, likes/dislikes over time and stores in `.octocode/user-profile.md`
- **Auto-learning** — Creates skill files in `.octocode/skills/` for repeated task patterns
- **Smart math** — Solves arithmetic instantly without tools
- **Pattern recognition** — Applies rename/numbering patterns to all similar cases automatically
- **Dynamic vault/knowledge** — Vault and knowledge graph inject as compact references, read on demand when keywords mentioned
- **Socials** — Facebook, Instagram, X, GitHub, LinkedIn, Website
- **Dynamic age** — Calculates Farhan's age from birthday (September 2, 2005)
- **Agent modes** — All 4 modes documented: `build`, `plan`, `compose`, `agent-swarm`
- **Slash commands** — `/understand`, `/dream`, `/distill`, `/md`
- **npm package** — `npm i -g octocode-ai` with auto-installing platform binaries
- **Curl installer** — `curl -fsSL https://raw.githubusercontent.com/farhanic017/octocode/main/install | bash`

### Fixed
- **Brain dialog crash** — Fixed orphan text node error that crashed TUI on open
- **Memory leaks** — Cleaned up 6 leaks: event listeners in session/index.tsx and prompt/index.tsx, voiceTimer interval, pinyin cache unbounded growth, workflow scroll map unbounded growth, footer timeout race condition
- **Search removed from Message Actions** — Cleaner dialog without redundant search
- **Sidebar hidden by default** — Session sidebar no longer shows automatically
- **dialog-variant crash** — Removed invalid `compact` and `renderFilter` props
- **Workspace trust default** — Changed to `true` so users aren't prompted on every start

### Improved
- **Reduced prompt size** — Vault injects paths only (not full content), knowledge graph limited to 5 nodes
- **Faster npm install** — Lightweight wrapper package (5KB) with platform binaries as optional dependencies
- **README updated** — Correct image path, install/uninstall commands, all 4 agent modes, slash commands

## [2.0.0] — 2026-06-25

### New
- **Session runtime (V2)** — Durable conversational history with context epoch management
- **Plugin system** — MCP protocol support with custom tool definitions
- **Built-in agents** — `build` (full access) and `plan` (read-only) modes
- **Subagent orchestration** — `@general` subagent for complex multi-step tasks
- **200k+ token sessions** — Sessions no longer crash at large context windows
- **Smart compaction** — Automatic memory management with context epoch transitions
- **Mid-conversation system messages** — Durable system context updates
- **Managed tool output** — Large outputs stored as files with bounded previews
- **Multi-provider support** — OpenAI, Anthropic, Google, and custom providers
- **CLI command: `octo`** — Faster, cleaner command name
- **Windows installer** — PowerShell install script (`install.ps1`)
- **Auto-update** — Automatic patch updates on startup

### Architecture
- System Context Registry with scoped contributions
- Context Snapshot for state comparison and reconciliation
- Safe Provider-Turn Boundary for atomic context admission
- Model Request Options separated from Generation Controls
- Simplified publish workflow (CLI-only, no Azure signing required)

## [1.5]

Intermediate release with session improvements and TUI enhancements.

### New
- **Session enhancements** — Improved session input handling and runner
- **TUI prompt component** — Redesigned terminal UI prompt
- **Session HTTP API** — HTTP handlers for session management
- **Plugin auth** — GitLab and Poe authentication support
- **Obsidian graphify** — Code knowledge base generation

### Improved
- LLM runner stability
- TUI dialog message handling
- Context sync between components

## [1.0]

Initial public release of OctoCode.

### Features
- **CLI tool** — `opencode` command (later renamed to `octo`)
- **Multi-provider AI** — Support for OpenAI, Anthropic, and Google models
- **Terminal UI** — Interactive SolidJS-based terminal interface
- **Code editing** — File read, write, and search capabilities
- **Shell execution** — Bash command execution with safety checks
- **Git integration** — Commit, diff, and branch operations
- **Session persistence** — Conversation history saved locally
- **OpenAPI spec** — HTTP API for external integrations
- **npm package** — Published as `octocode-ai` on npm

### Providers
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)

---

For the full release history, see [GitHub Releases](https://github.com/farhanic017/octocode/releases).
