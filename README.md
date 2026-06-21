<p align="center">
  <a href="https://octocode.ai">
    <pre>
             _______  _______ _________ _______  _______  _______  ______   _______
             (  ___  )(  ____ \__   __/(  ___  )(  ____ \(  ___  )(  __  \ (  ____ \
             | (   ) || (    \/   ) (   | (   ) || (    \/| (   ) || (  \  )| (    \/
             | |   | || |         | |   | |   | || |      | |   | || |   ) || (__    
             | |   | || |         | |   | |   | || |      | |   | || |   | ||  __)   
             | |   | || |         | |   | |   | || |      | |   | || |   ) || (      
             | (___) || (____/\   | |   | (___) || (____/\| (___) || (__/  )| (____/\ 
             (_______)(_______/   )_(   (_______)(_______/(_______)(______/ (_______/
    </pre>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://octocode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/octocode-ai"><img alt="npm" src="https://img.shields.io/npm/v/octocode-ai?style=flat-square" /></a>
  <a href="https://github.com/farhanic017/octocode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/farhanic017/octocode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OctoCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://octocode.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://octocode.ai/install | bash

# Package managers
npm i -g octocode-ai@latest        # or bun/pnpm/yarn
scoop install octocode             # Windows
choco install octocode             # Windows
brew install farhanic017/tap/octocode # macOS and Linux (recommended, always up to date)
brew install octocode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S octocode            # Arch Linux (Stable)
paru -S octocode-bin               # Arch Linux (Latest from AUR)
mise use -g octocode               # Any OS
nix run nixpkgs#octocode           # or github:farhanic017/octocode for latest dev branch
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

OctoCode is also available as a desktop application. Download directly from the [releases page](https://github.com/farhanic017/octocode/releases) or [octocode.ai/download](https://octocode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `octocode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `octocode-desktop-mac-x64.dmg`     |
| Windows               | `octocode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask octocode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/octocode-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$OCTO_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.octo/bin` - Default fallback

```bash
# Examples
OCTO_INSTALL_DIR=/usr/local/bin curl -fsSL https://octocode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://octocode.ai/install | bash
```

### What's New

- **Renamed to OctoCode** - Rebranded from OpenCode to OctoCode with new identity
- **New CLI command: `octo`** - Faster, cleaner command name
- **Fixed 200k+ token sessions** - Sessions no longer crash at large context windows
- **Improved compaction** - Better memory management for long conversations
- **Desktop app support** - Native desktop application now available
- **Multi-provider support** - Works with OpenAI, Anthropic, Google, and more
- **Plugin system** - Extensible architecture with MCP and custom tools

### Agents

OctoCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://octocode.ai/docs/agents).

### Documentation

For more info on how to configure OctoCode, [**head over to our docs**](https://octocode.ai/docs).

### Contributing

If you're interested in contributing to OctoCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on OctoCode

If you are working on a project that's related to OctoCode and is using "octo" as part of its name, for example "octocode-dashboard" or "octocode-mobile", please add a note to your README to clarify that it is not built by the OctoCode team and is not affiliated with us in any way.

---

**Join our community** [Discord](https://discord.gg/octocode) | [X.com](https://x.com/octocode)

