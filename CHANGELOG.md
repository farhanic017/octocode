# Changelog

All notable changes to OctoCode are documented here.

## [4.2.1] - 2026-07-07

### Fixed
- **npm install** — corrected `bin` field to point to `bin/octo` instead of `bin/octocode`, fixing "command not found" after install
- **postinstall.mjs** — replaced stale `@mimo-ai/mimocode-*` references with `octocode-ai-*`, binary names now `octocode.exe`/`octocode`
- **Build targets** — trimmed from 12 platform variants down to 5 active platforms (darwin-arm64, linux-arm64, linux-x64, windows-arm64, windows-x64)

### Changed
- **Auto-dream disabled** — automatic dream sessions no longer fire on startup, preventing unwanted old session cleanup
- **OCTOCODE_V4 branding** — home screen banner updated from V2.5 to V4

## [4.2.0] - 2026-07-07

### New
- **Creator identity system** — background identity verification via git config, GitHub CLI, and GitHub Desktop login. Full unrestricted access for the creator, restricted access for everyone else
- **Content filtering** — NSFW, violence, hate speech, and dangerous content detection on user input and AI responses
- **Anti-jailbreak detection** — detects and blocks system prompt extraction, roleplay bypasses, hypothetical scenario tricks, and social engineering attempts
- **System prompt protection** — embedded anti-disclosure instructions in the system prompt layer
- **Desktop integration guard** — monitors unauthorized desktop app access

### Changed
- **npm package** — zero-dependency lightweight wrapper with platform binaries as optional dependencies
- **5 active platforms only** — darwin-arm64, linux-arm64, linux-x64, windows-arm64, windows-x64. No more baseline or musl variants
- **Version display** — home screen shows "OCTOCODE V4" banner

### Fixed
- **Effect SchemaAST crash** — resolved `Schema.Struct()` crash by inlining permission schema fields
- **NamedError.create zod bridge** — runtime zod-to-Effect schema conversion for error handling
- **Snapshot.FileDiff** — fixed array construction using `Schema.Array()` instead of `.array()`

## [3.9.6] - 2026-07-04

### Fixed
- **Platform cleanup** — removed 7 unused platform builds, kept 5 active targets
- **Binary naming** — consistent `octocode-ai-{platform}-{arch}` naming across all packages

## [3.9.0] - 2026-07-04

### New
- **All 12 platform builds** — full cross-platform binary compilation
- **Smoke tests** — automated version check on build for current platform

### Fixed
- **Windows bin entry** — corrected PowerShell compatibility in installer
- **postinstall script** — fixed binary path resolution on Windows

## [3.7.0] - 2026-07-04

### New
- **Desktop & browser automation** — integrated browser control and desktop interaction capabilities
- **Lazy dependency installation** — dependencies install on first use instead of all at once

## [3.4.0] - 2026-07-03

### New
- **Agent swarm** — parallel multi-agent orchestration with background task execution
- **v2.5 model branding** — updated to MiMo-V2.5-Pro as default model

## [3.3.0] - 2026-07-03

### New
- **Xiaomi API key provider** — direct Xiaomi API integration
- **Identity fixes** — improved creator identity detection accuracy

## [3.2.0] - 2026-07-03

### New
- **Smart skill matching engine** — relevance-sorted skills ranked by query match instead of alphabetical
- **Weighted token scoring** — name matches 3x, description matches 1x, with exact/substring/prefix differentiation
- **24-category synonym expansion** — "database" expands to db, sql, postgres, supabase, storage, query, data, table, migration
- **Compound token splitting** — "skill-dispatcher" splits into "skill" + "dispatcher"
- **Coverage bonus** — 80%+ query token match gets 1.3x multiplier, 100% gets additional 1.15x
- **Skill lifecycle tracking** — active skill badges, call counts, usage timestamps
- **Plain markdown skill fallback** — SKILL.md files without YAML frontmatter load from heading + blockquote
- **Curl installer** — `curl -fsSL .../install.sh | bash` cross-platform install

### Build
- 12 platform binaries published to npm
- 40 tests passing (23 matching + 6 lifecycle + 11 markdown fallback)

## [2.0.0] - 2026-06-30

### New
- **Personality** — roasts users, no language restrictions
- **User profiling** — learns preferences, style, likes/dislikes over time, stores in `.octocode/user-profile.md`
- **Auto-learning** — creates skill files in `.octocode/skills/` for repeated task patterns
- **Smart math** — solves arithmetic instantly without tools
- **Pattern recognition** — applies rename/numbering patterns to all similar cases automatically
- **Dynamic vault/knowledge** — vault and knowledge graph inject as compact references, read on demand
- **Agent modes** — all 4 modes: `build`, `plan`, `compose`, `agent-swarm`
- **Slash commands** — `/understand`, `/dream`, `/distill`, `/md`
- **npm package** — `npm i -g octocode-ai` with auto-installing platform binaries

### Fixed
- **Brain dialog crash** — fixed orphan text node error that crashed TUI on open
- **Memory leaks** — cleaned up 6 leaks: event listeners, voiceTimer interval, pinyin cache, workflow scroll map, footer timeout race condition
- **dialog-variant crash** — removed invalid compact and renderFilter props
- **Workspace trust default** — changed to true so users aren't prompted on every start

### Improved
- **Reduced prompt size** — vault injects paths only, knowledge graph limited to 5 nodes
- **Faster npm install** — lightweight wrapper package (5KB) with platform binaries as optional dependencies

## [2.0.0-beta] - 2026-06-25

### New
- **Session runtime (V2)** — durable conversational history with context epoch management
- **Plugin system** — MCP protocol support with custom tool definitions
- **Built-in agents** — `build` (full access) and `plan` (read-only) modes
- **Subagent orchestration** — `@general` subagent for complex multi-step tasks
- **200k+ token sessions** — sessions no longer crash at large context windows
- **Smart compaction** — automatic memory management with context epoch transitions
- **Multi-provider support** — OpenAI, Anthropic, Google, and custom providers
- **CLI command: `octo`** — faster, cleaner command name
- **Windows installer** — PowerShell install script (`install.ps1`)
- **Auto-update** — automatic patch updates on startup

### Architecture
- System Context Registry with scoped contributions
- Context Snapshot for state comparison and reconciliation
- Safe Provider-Turn Boundary for atomic context admission
- Model Request Options separated from Generation Controls

## [1.5] - 2026-06-20

### New
- **Session enhancements** — improved session input handling and runner
- **TUI prompt component** — redesigned terminal UI prompt
- **Session HTTP API** — HTTP handlers for session management
- **Plugin auth** — GitLab and Poe authentication support
- **Obsidian graphify** — code knowledge base generation

### Improved
- LLM runner stability
- TUI dialog message handling
- Context sync between components

## [1.0] - 2026-06-15

Initial public release of OctoCode.

### Features
- **CLI tool** — `opencode` command (later renamed to `octo`)
- **Multi-provider AI** — support for OpenAI, Anthropic, and Google models
- **Terminal UI** — interactive SolidJS-based terminal interface
- **Code editing** — file read, write, and search capabilities
- **Shell execution** — bash command execution with safety checks
- **Git integration** — commit, diff, and branch operations
- **Session persistence** — conversation history saved locally
- **OpenAPI spec** — HTTP API for external integrations
- **npm package** — published as `octocode-ai` on npm

### Providers
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)

---

For the full release history, see [GitHub Releases](https://github.com/farhanic017/octocode/releases).
