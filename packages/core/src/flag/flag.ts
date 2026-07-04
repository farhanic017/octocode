import { Config } from "effect"

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["OCTOCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("OCTOCODE_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  OCTOCODE_AUTO_HEAP_SNAPSHOT: truthy("OCTOCODE_AUTO_HEAP_SNAPSHOT"),
  OCTOCODE_GIT_BASH_PATH: process.env["OCTOCODE_GIT_BASH_PATH"],
  OCTOCODE_CONFIG: process.env["OCTOCODE_CONFIG"],
  OCTOCODE_CONFIG_CONTENT: process.env["OCTOCODE_CONFIG_CONTENT"],
  OCTOCODE_DISABLE_AUTOUPDATE: truthy("OCTOCODE_DISABLE_AUTOUPDATE"),
  OCTOCODE_ALWAYS_NOTIFY_UPDATE: truthy("OCTOCODE_ALWAYS_NOTIFY_UPDATE"),
  OCTOCODE_DISABLE_PRUNE: truthy("OCTOCODE_DISABLE_PRUNE"),
  OCTOCODE_DISABLE_TERMINAL_TITLE: truthy("OCTOCODE_DISABLE_TERMINAL_TITLE"),
  OCTOCODE_SHOW_TTFD: truthy("OCTOCODE_SHOW_TTFD"),
  OCTOCODE_DISABLE_AUTOCOMPACT: truthy("OCTOCODE_DISABLE_AUTOCOMPACT"),
  OCTOCODE_DISABLE_MODELS_FETCH: truthy("OCTOCODE_DISABLE_MODELS_FETCH"),
  OCTOCODE_DISABLE_MOUSE: truthy("OCTOCODE_DISABLE_MOUSE"),
  OCTOCODE_FAKE_VCS: process.env["OCTOCODE_FAKE_VCS"],
  OCTOCODE_SERVER_PASSWORD: process.env["OCTOCODE_SERVER_PASSWORD"],
  OCTOCODE_SERVER_USERNAME: process.env["OCTOCODE_SERVER_USERNAME"],

  // Experimental
  OCTOCODE_EXPERIMENTAL_FILEWATCHER: Config.boolean("OCTOCODE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  OCTOCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("OCTOCODE_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  OCTOCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("OCTOCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  OCTOCODE_MODELS_URL: process.env["OCTOCODE_MODELS_URL"],
  OCTOCODE_MODELS_PATH: process.env["OCTOCODE_MODELS_PATH"],
  OCTOCODE_DB: process.env["OCTOCODE_DB"],

  OCTOCODE_WORKSPACE_ID: process.env["OCTOCODE_WORKSPACE_ID"],
  OCTOCODE_EXPERIMENTAL_WORKSPACES: enabledByExperimental("OCTOCODE_EXPERIMENTAL_WORKSPACES"),
  OCTOCODE_EXPERIMENTAL_SESSION_SWITCHER: enabledByExperimental("OCTOCODE_EXPERIMENTAL_SESSION_SWITCHER"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get OCTOCODE_DISABLE_PROJECT_CONFIG() {
    return truthy("OCTOCODE_DISABLE_PROJECT_CONFIG")
  },
  get OCTOCODE_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("OCTOCODE_EXPERIMENTAL_REFERENCES")
  },
  get OCTOCODE_TUI_CONFIG() {
    return process.env["OCTOCODE_TUI_CONFIG"]
  },
  get OCTOCODE_CONFIG_DIR() {
    return process.env["OCTOCODE_CONFIG_DIR"]
  },
  get OCTOCODE_PURE() {
    return truthy("OCTOCODE_PURE")
  },
  get OCTOCODE_PERMISSION() {
    return process.env["OCTOCODE_PERMISSION"]
  },
  get OCTOCODE_PLUGIN_META_FILE() {
    return process.env["OCTOCODE_PLUGIN_META_FILE"]
  },
  get OCTOCODE_CLIENT() {
    return process.env["OCTOCODE_CLIENT"] ?? "cli"
  },
}


