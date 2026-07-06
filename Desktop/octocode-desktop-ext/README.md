# OctoCode Desktop Extension

Desktop automation, browser control, and AI-powered app interaction for [OctoCode](https://github.com/farhanic017/octocode-ai).

> **License:** GPL-3.0 or later — see [LICENSE](LICENSE)

## What It Does

OctoCode Desktop Extension gives OctoCode the ability to:

- **Control your mouse and keyboard** — click, type, scroll, drag across any desktop app
- **Open and manage apps** — launches via Win+S search, auto-snaps to split view
- **Take screenshots** — capture any part of your screen for vision analysis
- **Read clipboard** — copy text from any app and read it
- **Automate browser workflows** — navigate, click, fill forms, extract data
- **Guardrails** — blocks dangerous actions (password access, system modification, malware vectors)
- **Chat with AI apps** — open Claude, Kimi, Le Chat and have conversations through automation

## Architecture

```
octocode-desktop-ext/
├── tools/                    # OctoCode tool definitions
│   ├── desktop.ts           # Desktop automation tools (mouse, keyboard, screenshots)
│   ├── nut-persistent-worker.cjs  # Isolated nut-js process (never locks keyboard)
│   ├── nut-worker.cjs       # Single-action worker (legacy)
│   └── helper.ts            # Tool helper utilities
├── src/
│   ├── octocode-desktop/
│   │   ├── desktop-vision.ts    # Real-time vision pipeline
│   │   ├── img-optimize.cjs     # Screenshot resize + JPEG compression
│   │   ├── layout-cache.cjs     # App UI layout memory
│   │   ├── app-knowledge.cjs    # 25+ app layouts with coordinates
│   │   ├── farhan-apps.cjs      # Additional app layouts
│   │   ├── smart-nav.cjs        # Resolution-aware navigation engine
│   │   ├── chat-speed.cjs       # Batched chat actions
│   │   ├── visual-feedback.cjs  # Browser cursor/click animations
│   │   ├── browser-server.cjs   # Playwright JSON-RPC server
│   │   └── snap-knowledge.cjs   # Windows snap shortcuts reference
│   └── guardrail/                # Safety system
│       ├── guardrail.ts          # Core guardrail engine
│       ├── desktop-guardrail.ts  # Desktop-specific safety rules
│       ├── rate-limiter.ts       # Action rate limiting
│       └── tool-wrapper.ts       # Middleware combining checks
├── captcha/                     # CAPTCHA detection
│   ├── captcha.ts               # reCAPTCHA, hCaptcha, Turnstile detection
│   └── captcha-ui.ts            # TUI notification formatting
├── swarm/
│   └── browser-task.ts          # Browser task orchestration for agent swarm
├── blender-mcp/                 # Blender MCP integration
│   ├── addon.py                 # Python addon for Blender (TCP server)
│   ├── client.js                # Node.js client connecting to addon
│   └── tools.js                 # 9 OctoCode tools for Blender control
├── browser/                     # Browser automation scripts
│   └── screenshot.ps1           # PowerShell screenshot helper
└── package.json
```

## Installation

```bash
npm install octocode-desktop-ext
```

Or for development:
```bash
git clone https://github.com/farhanic017/octocode-desktop-ext.git
cd octocode-desktop-ext
npm install
```

## Blender MCP Setup

1. Open Blender 5.1+
2. Edit > Preferences > Add-ons > Install > select `blender-mcp/addon.py`
3. Enable the addon, start the server in the sidebar
4. OctoCode connects to `localhost:9876`

## Key Features

### Desktop Automation
- Mouse control: click, double-click, move, drag (via isolated nut-js worker)
- Keyboard control: type, key press, key combos (Win+S, Ctrl+V, etc.)
- Screenshots: full screen or region capture
- Clipboard read/write
- App management: open, close, focus, snap to split view

### Browser Automation
- Playwright-based with visual feedback injection
- Navigate, click, type, screenshot, evaluate JavaScript
- CAPTCHA detection (reCAPTCHA, hCaptcha, Turnstile)
- Browserbase integration for remote sessions

### Guardrails
- Blocks dangerous desktop actions (password managers, system files, malware vectors)
- Rate limiting per tool type
- Cross-platform path safety (Windows, macOS, Linux)
- Hidden safety mechanisms — detection methods are never revealed

### 25+ Pre-trained App Layouts
Claude Desktop, Figma, Canva, Kimi, VSCode, Blender, Obsidian, Discord, and more. Each with exact coordinates for split-view automation.

## Platform Support

| Platform | Status |
|----------|--------|
| Windows x64 | ✅ Fully supported |
| Windows ARM64 | ✅ Supported |
| macOS ARM64 | ✅ Supported |
| Linux x64 | ✅ Supported |
| Linux ARM64 | ✅ Supported |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Author

**Farhan Dhrubo** — [GitHub](https://github.com/farhanic017) | [Website](https://farhanic.vercel.app)

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.
