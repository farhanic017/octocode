# Changelog

All notable changes to OctoCode are documented here.

## [2.0] — Current

The V2 rewrite introduces a durable session runtime with context epoch management, multi-agent orchestration, and a desktop application.

### New
- **Session runtime (V2)** — Durable conversational history with context epoch management
- **Desktop app** — Native application for macOS, Windows, and Linux
- **Plugin system** — MCP protocol support with custom tool definitions
- **Built-in agents** — `build` (full access) and `plan` (read-only) modes
- **Subagent orchestration** — `@general` subagent for complex multi-step tasks
- **200k+ token sessions** — Sessions no longer crash at large context windows
- **Smart compaction** — Automatic memory management with context epoch transitions
- **Mid-conversation system messages** — Durable system context updates
- **Managed tool output** — Large outputs stored as files with bounded previews
- **Multi-provider support** — OpenAI, Anthropic, Google, and custom providers
- **CLI command: `octo`** — Faster, cleaner command name
- **Obsidian integration** — Knowledge base integration for documentation
- **Swarm state tracking** — Multi-agent coordination and state persistence

### Architecture
- System Context Registry with scoped contributions
- Context Snapshot for state comparison and reconciliation
- Safe Provider-Turn Boundary for atomic context admission
- Model Request Options separated from Generation Controls

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
