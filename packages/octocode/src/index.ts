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
const commandModules: Record<string, () => Promise<any>> = {
  run: () => import("./cli/cmd/run"),
  tui: () => import("./cli/cmd/tui"),
  serve: () => import("./cli/cmd/serve"),
  web: () => import("./cli/cmd/web"),
  providers: () => import("./cli/cmd/providers"),
  models: () => import("./cli/cmd/models"),
  upgrade: () => import("./cli/cmd/upgrade"),
  uninstall: () => import("./cli/cmd/uninstall"),
  debug: () => import("./cli/cmd/debug"),
  stats: () => import("./cli/cmd/stats"),
  mcp: () => import("./cli/cmd/mcp"),
  github: () => import("./cli/cmd/github"),
  pr: () => import("./cli/cmd/pr"),
  export: () => import("./cli/cmd/export"),
  import: () => import("./cli/cmd/import"),
  session: () => import("./cli/cmd/session"),
  agent: () => import("./cli/cmd/agent"),
  plug: () => import("./cli/cmd/plug"),
  db: () => import("./cli/cmd/db"),
  account: () => import("./cli/cmd/account"),
  generate: () => import("./cli/cmd/generate"),
  attach: () => import("./cli/cmd/attach"),
  acp: () => import("./cli/cmd/acp"),
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

// Register commands with lazy-loading — only loads the module when invoked
cli.command("run [message]", "run octocode with a message", (yargs) => {
  return yargs.positional("message", { describe: "message to send", type: "string" })
}, async (argv) => {
  const mod = await commandModules.run()
  await (mod.RunCommand ?? mod.default).handler(argv)
})

cli.command("tui", "start octocode tui", () => {}, async () => {
  const mod = await commandModules.tui()
  await (mod.TuiThreadCommand ?? mod.default).handler({})
})

cli.command("serve", "start a headless server", () => {}, async () => {
  const mod = await commandModules.serve()
  await (mod.ServeCommand ?? mod.default).handler({})
})

cli.command("web", "start server and open web interface", () => {}, async () => {
  const mod = await commandModules.web()
  await (mod.WebCommand ?? mod.default).handler({})
})

cli.command("providers", "manage AI providers", () => {}, async (argv) => {
  const mod = await commandModules.providers()
  await (mod.ProvidersCommand ?? mod.default).handler(argv)
})

cli.command("models [provider]", "list available models", () => {}, async (argv) => {
  const mod = await commandModules.models()
  await (mod.ModelsCommand ?? mod.default).handler(argv)
})

cli.command("upgrade [target]", "upgrade octocode", () => {}, async (argv) => {
  const mod = await commandModules.upgrade()
  await (mod.UpgradeCommand ?? mod.default).handler(argv)
})

cli.command("uninstall", "uninstall octocode", () => {}, async () => {
  const mod = await commandModules.uninstall()
  await (mod.UninstallCommand ?? mod.default).handler({})
})

cli.command("debug", "debugging tools", () => {}, async () => {
  const mod = await commandModules.debug()
  await (mod.DebugCommand ?? mod.default).handler({})
})

cli.command("stats", "show token usage", () => {}, async () => {
  const mod = await commandModules.stats()
  await (mod.StatsCommand ?? mod.default).handler({})
})

cli.command("mcp", "manage MCP servers", () => {}, async (argv) => {
  const mod = await commandModules.mcp()
  await (mod.McpCommand ?? mod.default).handler(argv)
})

cli.command("github", "manage GitHub agent", () => {}, async (argv) => {
  const mod = await commandModules.github()
  await (mod.GithubCommand ?? mod.default).handler(argv)
})

cli.command("pr <number>", "fetch and checkout a PR", () => {}, async (argv) => {
  const mod = await commandModules.pr()
  await (mod.PrCommand ?? mod.default).handler(argv)
})

cli.command("export [sessionID]", "export session data", () => {}, async (argv) => {
  const mod = await commandModules.export()
  await (mod.ExportCommand ?? mod.default).handler(argv)
})

cli.command("import <file>", "import session data", () => {}, async (argv) => {
  const mod = await commandModules.import()
  await (mod.ImportCommand ?? mod.default).handler(argv)
})

cli.command("session", "manage sessions", () => {}, async (argv) => {
  const mod = await commandModules.session()
  await (mod.SessionCommand ?? mod.default).handler(argv)
})

cli.command("agent", "manage agents", () => {}, async (argv) => {
  const mod = await commandModules.agent()
  await (mod.AgentCommand ?? mod.default).handler(argv)
})

cli.command("plug <module>", "install plugin", () => {}, async (argv) => {
  const mod = await commandModules.plug()
  await (mod.PluginCommand ?? mod.default).handler(argv)
})

cli.command("db", "database tools", () => {}, async (argv) => {
  const mod = await commandModules.db()
  await (mod.DbCommand ?? mod.default).handler(argv)
})

cli.command("account", "account settings", () => {}, async (argv) => {
  const mod = await commandModules.account()
  await (mod.ConsoleCommand ?? mod.default).handler(argv)
})

cli.command("generate", "generate code", () => {}, async (argv) => {
  const mod = await commandModules.generate()
  await (mod.GenerateCommand ?? mod.default).handler(argv)
})

cli.command("attach <url>", "attach to running server", () => {}, async (argv) => {
  const mod = await commandModules.attach()
  await (mod.AttachCommand ?? mod.default).handler(argv)
})

cli.command("acp", "start ACP server", () => {}, async () => {
  const mod = await commandModules.acp()
  await (mod.AcpCommand ?? mod.default).handler({})
})

cli.command("completion", "generate shell completion", () => {}, async () => {
  // Already handled by yargs
})

// Default command: start TUI
cli.middleware(async (argv) => {
  // If no command matched, start the TUI
  if (!argv._.length || argv._[0] === '') {
    const mod = await commandModules.tui()
    await (mod.TuiThreadCommand ?? mod.default).handler({})
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
