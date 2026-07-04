# Changelog

All notable changes to OctoCode are documented here.

## [3.9.6] — 2026-07-05

### Platform Changes
- **Dropped: `darwin-x64`** — No longer built or supported. Apple Silicon is the standard.
- **Dropped: `linux-x64-musl`** — No longer built or supported.
- **Dropped: `linux-arm64-musl`** — No longer built or supported.
- Remaining platforms: `darwin-arm64`, `linux-arm64`, `linux-x64`, `windows-arm64`, `windows-x64`

### Previously Dropped (v3.9.5)
- `darwin-x64-baseline`, `linux-x64-baseline`, `linux-x64-baseline-musl`, `windows-x64-baseline`

### Build
- **5 platform binaries** — Down from 12. Cleaner, faster releases.
- Binary-only package, zero npm dependencies.

## [3.5.0] — 2026-07-05

### Desktop Automation
- **Desktop control** — Mouse clicks, keyboard typing, scrolling, drag & drop
- **Screenshot capture** — Full screen or region capture with base64 output
- **App launcher** — Open any desktop application by name
- **Terminal opener** — Open new terminal windows with optional commands
- **Clipboard operations** — Copy, paste, get/set clipboard content
- **Window management** — List, focus, minimize, maximize, close, resize, move windows
- **Screen recording** — Record desktop with configurable FPS
- **Workflow automation** — Record and replay multi-step desktop workflows
- **Visual QA** — Capture baselines and compare for regression testing

### Browser Automation
- **Browser navigate** — Open URLs in browser
- **Browser click** — Click elements by CSS selector
- **Browser type** — Type into input fields
- **Browser screenshot** — Capture browser viewport
- **Browser evaluate** — Execute JavaScript in browser
- **Browser wait** — Wait for elements or conditions
- **Browser hover** — Hover over elements
- **Browser select** — Select dropdown options
- **Browser drag** — Drag and drop elements

### Real-time Streaming
- **WebSocket streaming** — 10fps screenshot streaming to connected clients
- **Live viewport** — Real-time desktop preview component
- **Vision integration** — Screenshots attached to tool results for vision models

### Cross-platform Support
- **Windows** — Full desktop + browser automation
- **macOS** — Desktop automation via cliclick, browser via Playwright
- **Linux** — Desktop automation via xdotool, browser via Playwright

### Bug Fixes
- Fixed Windows cross-drive path resolution (D:\ vs C:\)
- Fixed drive-relative path handling (e.g., `C:../outside.txt`)
- Fixed 12 pre-existing test failures on Windows

### Testing
- 633 tests passing (0 failures)
- 20 new automation tools
- Integration tests for desktop and browser tools

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
