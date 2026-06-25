import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import * as Log from "@octocode-ai/core/util/log"
import { UI } from "./cli/ui"
import { Installation } from "./installation"
import { InstallationVersion } from "@octocode-ai/core/installation/version"
import { NamedError } from "@octocode-ai/core/util/error"
import { FormatError } from "./cli/error"
import { EOL } from "os"
import { Heap } from "./cli/heap"
import { ensureProcessMetadata } from "@octocode-ai/core/util/octocode-process"
import { isRecord } from "@/util/record"

const processMetadata = ensureProcessMetadata("main")

process.on("unhandledRejection", (e) => {
  Log.Default.error("rejection", {
    e: e instanceof Error ? e.message : String(e),
  })
})

process.on("uncaughtException", (e) => {
  Log.Default.error("exception", {
    e: e instanceof Error ? e.message : String(e),
  })
})

const args = hideBin(process.argv)

function show(out: string) {
  const text = out.trimStart()
  if (!text.startsWith("octo ")) {
    process.stderr.write(UI.logo() + EOL + EOL)
    process.stderr.write(text + EOL)
    return
  }
  process.stderr.write(out)
}

// Lazy-load commands only when needed to reduce startup RAM
async function loadCommand(path: string) {
  const mod = await import(path)
  return mod.default ?? mod[Object.keys(mod)[0]]
}

const cli = yargs(args)
  .parserConfiguration({ "populate--": true })
  .scriptName("octo")
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", InstallationVersion)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("pure", {
    describe: "run without external plugins",
    type: "boolean",
  })
  .middleware(async (opts) => {
    if (opts.pure) {
      process.env.OCTOCODE_PURE = "1"
    }

    await Log.init({
      print: process.argv.includes("--print-logs"),
      dev: Installation.isLocal(),
      level: (() => {
        if (opts.logLevel) return opts.logLevel as Log.Level
        if (Installation.isLocal()) return "DEBUG"
        return "INFO"
      })(),
    })

    Heap.start()

    process.env.AGENT = "1"
    process.env.OCTOCODE = "1"
    process.env.OCTOCODE_PID = String(process.pid)

    Log.Default.info("octo", {
      version: InstallationVersion,
      args: process.argv.slice(2),
      process_role: processMetadata.processRole,
      run_id: processMetadata.runID,
    })
  })
  .usage("")

// Lazy-load commands — they're only loaded when the user invokes them
cli.command("run", "run octocode with a message", (yargs) => {
  return yargs.positional("message", { type: "string" })
}, async (argv) => {
  const { RunCommand } = await import("./cli/cmd/run")
  await RunCommand.handler(argv)
})

cli.command("tui", "start octocode tui", () => {}, async () => {
  const { TuiThreadCommand } = await import("./cli/cmd/tui")
  await TuiThreadCommand.handler({})
})

cli.command("serve", "start a headless server", () => {}, async () => {
  const { ServeCommand } = await import("./cli/cmd/serve")
  await ServeCommand.handler({})
})

cli.command("web", "start server and open web interface", () => {}, async () => {
  const { WebCommand } = await import("./cli/cmd/web")
  await WebCommand.handler({})
})

cli.command("providers", "manage AI providers", (yargs) => {
  return yargs.command("add", "add a provider").command("remove", "remove a provider").command("list", "list providers")
}, async (argv) => {
  const { ProvidersCommand } = await import("./cli/cmd/providers")
  await ProvidersCommand.handler(argv)
})

cli.command("models [provider]", "list available models", () => {}, async (argv) => {
  const { ModelsCommand } = await import("./cli/cmd/models")
  await ModelsCommand.handler(argv)
})

cli.command("upgrade [target]", "upgrade octocode", () => {}, async (argv) => {
  const { UpgradeCommand } = await import("./cli/cmd/upgrade")
  await UpgradeCommand.handler(argv)
})

cli.command("uninstall", "uninstall octocode", () => {}, async () => {
  const { UninstallCommand } = await import("./cli/cmd/uninstall")
  await UninstallCommand.handler({})
})

cli.command("debug", "debugging tools", () => {}, async () => {
  const { DebugCommand } = await import("./cli/cmd/debug")
  await DebugCommand.handler({})
})

cli.command("stats", "show token usage", () => {}, async () => {
  const { StatsCommand } = await import("./cli/cmd/stats")
  await StatsCommand.handler({})
})

cli.command("mcp", "manage MCP servers", () => {}, async (argv) => {
  const { McpCommand } = await import("./cli/cmd/mcp")
  await McpCommand.handler(argv)
})

cli.command("github", "manage GitHub agent", () => {}, async (argv) => {
  const { GithubCommand } = await import("./cli/cmd/github")
  await GithubCommand.handler(argv)
})

cli.command("pr <number>", "fetch and checkout a PR", () => {}, async (argv) => {
  const { PrCommand } = await import("./cli/cmd/pr")
  await PrCommand.handler(argv)
})

cli.command("export [sessionID]", "export session data", () => {}, async (argv) => {
  const { ExportCommand } = await import("./cli/cmd/export")
  await ExportCommand.handler(argv)
})

cli.command("import <file>", "import session data", () => {}, async (argv) => {
  const { ImportCommand } = await import("./cli/cmd/import")
  await ImportCommand.handler(argv)
})

cli.command("session", "manage sessions", () => {}, async (argv) => {
  const { SessionCommand } = await import("./cli/cmd/session")
  await SessionCommand.handler(argv)
})

cli.command("agent", "manage agents", () => {}, async (argv) => {
  const { AgentCommand } = await import("./cli/cmd/agent")
  await AgentCommand.handler(argv)
})

cli.command("plug <module>", "install plugin", () => {}, async (argv) => {
  const { PluginCommand } = await import("./cli/cmd/plug")
  await PluginCommand.handler(argv)
})

cli.command("db", "database tools", () => {}, async (argv) => {
  const { DbCommand } = await import("./cli/cmd/db")
  await DbCommand.handler(argv)
})

cli.command("account", "account settings", () => {}, async (argv) => {
  const { ConsoleCommand } = await import("./cli/cmd/account")
  await ConsoleCommand.handler(argv)
})

cli.command("generate", "generate code", () => {}, async (argv) => {
  const { GenerateCommand } = await import("./cli/cmd/generate")
  await GenerateCommand.handler(argv)
})

cli.command("attach <url>", "attach to running server", () => {}, async (argv) => {
  const { AttachCommand } = await import("./cli/cmd/attach")
  await AttachCommand.handler(argv)
})

cli.command("acp", "start ACP server", () => {}, async () => {
  const { AcpCommand } = await import("./cli/cmd/acp")
  await AcpCommand.handler({})
})

cli.command("completion", "generate shell completion", () => {}, async () => {
  // Already handled by yargs
})

// Default command: start TUI
cli.middleware(async (argv) => {
  // If no command matched, start the TUI
  if (!argv._.length || argv._[0] === '') {
    const { TuiThreadCommand } = await import("./cli/cmd/tui")
    await TuiThreadCommand.handler({})
  }
})

cli.fail((msg, err) => {
  if (
    msg?.startsWith("Unknown argument") ||
    msg?.startsWith("Not enough non-option arguments") ||
    msg?.startsWith("Invalid values:")
  ) {
    if (err) throw err
    cli.showHelp(show)
  }
  if (err) throw err
  process.exit(1)
}).strict()

try {
  if (args.includes("-h") || args.includes("--help")) {
    await cli.parse(args, (err: Error | undefined, _argv: unknown, out: string) => {
      if (err) throw err
      if (!out) return
      show(out)
    })
  } else {
    await cli.parse()
  }
} catch (e) {
  let data: Record<string, any> = {}
  if (e instanceof Error) {
    Object.assign(data, {
      name: e.name,
      message: e.message,
      cause: e.cause?.toString(),
      stack: e.stack,
    })
  }

  if (e instanceof NamedError) {
    const obj = e.toObject()
    if (isRecord(obj.data)) {
      for (const [key, value] of Object.entries(obj.data)) {
        if (key === "name" || key === "stack" || key === "cause") continue
        data[key] = value
      }
    }
  }

  Log.Default.error("fatal", data)
  const formatted = FormatError(e)
  if (formatted) UI.error(formatted)
  if (formatted === undefined) {
    UI.error("Unexpected error, check log file at " + Log.file() + " for more details" + EOL)
    if (e instanceof Error) process.stderr.write(e.message + EOL)
  }
  process.exitCode = 1
} finally {
  process.exit()
}
