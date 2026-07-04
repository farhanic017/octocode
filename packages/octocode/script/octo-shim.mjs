#!/usr/bin/env node

import { spawnSync } from "child_process"
import { existsSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isWindows = process.platform === "win32"
const binaryPath = path.join(__dirname, isWindows ? "octocode.exe" : "octocode")

if (!existsSync(binaryPath)) {
  console.error("Error: octocode-ai's postinstall script was not run.")
  console.error("")
  console.error("This occurs when using --ignore-scripts during installation, or when using a")
  console.error("package manager like pnpm that does not run postinstall scripts by default.")
  console.error("")
  console.error("To fix this, run the postinstall script manually:")
  console.error("  cd node_modules/octocode-ai && node postinstall.mjs")
  console.error("")
  console.error("Or reinstall octocode-ai without the --ignore-scripts flag.")
  process.exit(1)
}

const result = spawnSync(binaryPath, process.argv.slice(2), {
  stdio: "inherit",
  windowsHide: false,
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
