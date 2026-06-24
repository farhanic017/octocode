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
  <a href="https://github.com/farhanic017/octocode/blob/main/LICENSE"><img alt="License: GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square" /></a>
  <img alt="Downloads" src="https://img.shields.io/npm/dm/octocode-ai?style=flat-square&label=downloads" />
</p>

[![OctoCode V2 Desktop](designs/octocode%20home%20screen.png)](https://octocode.ai)

---

## Features

- **Multi-provider AI** — Works with OpenAI, Anthropic, Google, and more
- **Desktop app** — Native desktop application for macOS, Windows, and Linux
- **Plugin system** — Extensible architecture with MCP protocol and custom tools
- **Built-in agents** — Switch between `build` (full access) and `plan` (read-only) modes
- **200k+ token sessions** — Handle massive context windows without crashes
- **Smart compaction** — Automatic memory management for long conversations
- **Real-time collaboration** — Multi-agent orchestration for complex tasks

## Installation

```bash
# npm (recommended)
npm i -g octocode-ai@latest

# curl (one-liner)
curl -fsSL https://octocode.ai/install | bash
```

### Uninstall

```bash
# npm
npm uninstall -g octocode-ai

# manual (curl install)
rm ~/.octo/bin/octo
```

### Quick Start

```bash
cd your-project
octo
```

## Agents

| Agent | Access | Use Case |
|-------|--------|----------|
| `build` | Full read/write | Default agent for development work |
| `plan` | Read-only | Analysis, exploration, and planning |


## Documentation

For configuration, plugins, and advanced usage, visit **[octocode.ai/docs](https://octocode.ai/docs)**.

## Community

- [Discord](https://discord.gg/octocode) — Get help and connect with the community
- [X.com]((https://x.com/farhanic0)) — Follow for updates

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

[GNU General Public License v3.0](./LICENSE)
