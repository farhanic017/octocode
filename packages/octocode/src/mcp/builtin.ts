import type { ConfigMCPV1 } from "@octocode-ai/core/v1/config/mcp"

/**
 * Built-in MCP servers that are enabled by default.
 * Users can disable them by setting `enabled: false` in their config.
 */
export const BuiltinMCPs: Record<string, ConfigMCPV1.Info> = {
  /**
   * Graphify - Knowledge graph tool for codebases, docs, papers, images.
   * Turns any folder of files into a navigable knowledge graph with
   * community detection, HTML visualization, and JSON export.
   *
   * Usage: graphify <path> or /graphify command
   * Requires: Python 3 with graphifyy package installed (pip install graphifyy)
   */
  graphify: {
    type: "local",
    command: ["python3", "-m", "graphify.serve"],
    environment: {
      PYTHONUTF8: "1",
    },
    enabled: true,
    timeout: 30000,
  },

  /**
   * Obsidian - MCP server for Obsidian vault integration.
   * Connects to Obsidian via the Local REST API plugin.
   *
   * Setup required:
   * 1. Install "Local REST API" plugin in Obsidian
   * 2. Enable the plugin and copy the API key
   * 3. Set OBSIDIAN_API_KEY environment variable or add to config:
   *    "mcp": {
   *      "obsidian": {
   *        "environment": {
   *          "OBSIDIAN_API_KEY": "your-api-key-here"
   *        }
   *      }
   *    }
   *
   * Default settings work with standard Obsidian Local REST API plugin config.
   */
  obsidian: {
    type: "local",
    command: ["npx", "-y", "@anthropic/mcp-obsidian"],
    environment: {
      OBSIDIAN_HOST: "localhost",
      OBSIDIAN_PORT: "27123",
    },
    enabled: true,
    timeout: 15000,
  },
}

/**
 * Get built-in MCPs with optional user overrides applied.
 * User config takes precedence over built-in defaults.
 */
export function getBuiltinMCPs(
  userMCPs?: Record<string, ConfigMCPV1.Info | { enabled: boolean }>,
): Record<string, ConfigMCPV1.Info> {
  const result: Record<string, ConfigMCPV1.Info> = {}

  for (const [name, builtin] of Object.entries(BuiltinMCPs)) {
    const userOverride = userMCPs?.[name]

    if (userOverride && "enabled" in userOverride && !("type" in userOverride)) {
      // User only set enabled flag, keep built-in config with that override
      result[name] = { ...builtin, enabled: userOverride.enabled }
    } else if (userOverride && "type" in userOverride) {
      // User provided full config, merge with built-in (user wins)
      result[name] = { ...builtin, ...userOverride }
    } else {
      // No user override, use built-in default
      result[name] = builtin
    }
  }

  // Add any user-defined MCPs that aren't built-in
  if (userMCPs) {
    for (const [name, config] of Object.entries(userMCPs)) {
      if (!(name in BuiltinMCPs)) {
        if ("type" in config) {
          result[name] = config
        }
      }
    }
  }

  return result
}
