# Changelog

All notable changes to OctoCode are documented here.

## [2.0.0] — 2026-07-03

### New — Smart Skill Matching Engine
- **Relevance-sorted skills** — System prompt now ranks skills by relevance to the user's query instead of alphabetical order. The LLM sees the most useful skill first.
- **Weighted token scoring** — Name matches score 3x, description matches score 1x. Exact word matches (1.0) beat substring matches (0.8) beat prefix matches (0.7).
- **24-category synonym expansion** — "database" automatically expands to "db", "sql", "postgres", "supabase", "storage", "query", "data", "table", "migration". Reverse expansion too: "postgres" → "database". Two-hop transitive: "motion" → "animation" → "gsap".
- **Compound token splitting** — "skill-dispatcher" splits into "skill" + "dispatcher" for better matching.
- **Coverage bonus** — If 80%+ of query tokens match a skill, score gets 1.3x multiplier. 100% match gets additional 1.15x.
- **Session query extraction** — The user's current message is extracted and passed to the matching engine, so the system prompt adapts per-turn.

### New — Skill Lifecycle Tracking
- **Active skill tracking** — Skills are marked active when loaded via the `skill` tool. Tracks load time, call count, and last used timestamp.
- **Score boost for active skills** — Already-loaded skills get 1.5x multiplier in matching. Frequently used skills get up to +2.0 bonus points.
- **System prompt indicators** — Active skills show `[ACTIVE: N calls]` badge in the `<available_skills>` XML block.
- **TUI active badge** — Skill dialog shows `[active]` next to loaded skills.
- **API active status** — Skill list endpoint returns `active` boolean and `callCount` per skill.

### New — Plain Markdown Skill Fallback
- **No-frontmatter support** — SKILL.md files without YAML frontmatter now load by extracting name from `# heading` and description from `> blockquote`.
- **Gemini-style compatibility** — Skills written in Gemini format (`# name\n> description`) are recognized automatically.
- **Zero config** — Works with existing skill discovery. Only activates when frontmatter is missing.

### New — Curl Installer
- **Cross-platform install script** — `curl -fsSL https://raw.githubusercontent.com/farhanic017/octocode/main/install.sh | bash` detects OS and architecture, downloads correct binary.

### Build
- **12 platform binaries** — linux (arm64, x64, x64-baseline, arm64-musl, x64-musl, x64-baseline-musl) + darwin (arm64, x64, x64-baseline) + windows (arm64, x64, x64-baseline)
- **All 13 packages published to npm** — `octocode-ai@3.2.0` with 12 optional platform binaries
- **40 tests passing** — 23 matching engine + 6 lifecycle + 11 markdown fallback

### Files Changed
- `packages/opencode/src/skill/match.ts` — Matching engine (normalize, tokenize, expandSynonyms, matchToken, computeSmartScore, computeRelevance, matchSkills)
- `packages/opencode/src/skill/markdown-fallback.ts` — Plain markdown parser (heading + blockquote extraction)
- `packages/opencode/src/skill/index.ts` — ActiveMeta type, activate/deactivate/activeSkills/recordUsage methods, fmt() with relevance sorting and active badges
- `packages/opencode/src/tool/skill.ts` — activate() and recordUsage() hooks on skill load
- `packages/opencode/src/session/system.ts` — Passes active skills map and query to skill formatting
- `packages/opencode/src/session/prompt.ts` — Extracts user query text for relevance sorting
- `packages/opencode/src/server/routes/instance/index.ts` — API returns active status and call count
- `packages/opencode/src/cli/cmd/tui/component/dialog-skill.tsx` — Shows [active] badge in TUI
- `install.sh` — Cross-platform curl installer

## [2.0.0] — 2026-06-30

### New
- **Personality** — roasts users, no language restrictions
- **User profiling** — Learns preferences, style, likes/dislikes over time and stores in `.octocode/user-profile.md`
- **Auto-learning** — Creates skill files in `.octocode/skills/` for repeated task patterns
- **Smart math** — Solves arithmetic instantly without tools
- **Pattern recognition** — Applies rename/numbering patterns to all similar cases automatically
- **Dynamic vault/knowledge** — Vault and knowledge graph inject as compact references, read on demand when keywords mentioned
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
