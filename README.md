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
</p>

[![OctoCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://octocode.ai)

---

### Installation

```bash
# npm (recommended)
npm i -g octocode-ai@latest

# curl (one-liner)
curl -fsSL https://octocode.ai/install | bash
```

### What's New

- **New CLI command: `octo`** - Faster, cleaner command name
- **Fixed 200k+ token sessions** - Sessions no longer crash at large context windows
- **Improved compaction** - Better memory management for long conversations
- **Desktop app support** - Native desktop application now available
- **Multi-provider support** - Works with OpenAI, Anthropic, Google, and more
- **Plugin system** - Extensible architecture with MCP and custom tools

### Agents

OctoCode includes two built-in agents you can switch between.

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

### License

OctoCode is licensed under the [GNU General Public License v3.0](./LICENSE).

---

**Join our community** [Discord](https://discord.gg/octocode) | [X.com](https://x.com/octocode)
