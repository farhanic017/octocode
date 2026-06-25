#!/usr/bin/env node

import childProcess from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let packageJsonPath = path.join(__dirname, "package.json")
if (!fs.existsSync(packageJsonPath)) {
  packageJsonPath = path.join(__dirname, "..", "package.json")
}
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
const version = packageJson.version

const platformMap = { darwin: "darwin", linux: "linux", win32: "windows" }
const archMap = { x64: "x64", arm64: "arm64", arm: "arm" }

const platform = platformMap[os.platform()] ?? os.platform()
const arch = archMap[os.arch()] ?? os.arch()
const sourceBinary = platform === "windows" ? "octo.exe" : "octo"

let packageDir = __dirname
if (!fs.existsSync(path.join(packageDir, "package.json"))) {
  packageDir = path.join(__dirname, "..")
}
const targetBinary = path.join(packageDir, "bin", platform === "windows" ? "octocode.exe" : "octocode")

function supportsAvx2() {
  if (arch !== "x64") return false
  if (platform === "linux") {
    try { return /(^|\s)avx2(\s|$)/i.test(fs.readFileSync("/proc/cpuinfo", "utf8")) }
    catch { return false }
  }
  if (platform === "darwin") {
    try {
      const r = childProcess.spawnSync("sysctl", ["-n", "hw.optional.avx2_0"], { encoding: "utf8", timeout: 1500 })
      return r.status === 0 && (r.stdout || "").trim() === "1"
    } catch { return false }
  }
  if (platform === "windows") {
    const cmd = '(Add-Type -MemberDefinition "[DllImport(""kernel32.dll"")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);" -Name Kernel32 -Namespace Win32 -PassThru)::IsProcessorFeaturePresent(40)'
    for (const exe of ["powershell.exe", "pwsh.exe", "pwsh", "powershell"]) {
      try {
        const r = childProcess.spawnSync(exe, ["-NoProfile", "-NonInteractive", "-Command", cmd], { encoding: "utf8", timeout: 3000, windowsHide: true })
        if (r.status !== 0) continue
        const out = (r.stdout || "").trim().toLowerCase()
        if (out === "true" || out === "1") return true
        if (out === "false" || out === "0") return false
      } catch { continue }
    }
  }
  return false
}

function isMusl() {
  if (platform !== "linux") return false
  try { if (fs.existsSync("/etc/alpine-release")) return true } catch {}
  try {
    const r = childProcess.spawnSync("ldd", ["--version"], { encoding: "utf8" })
    return `${r.stdout || ""}${r.stderr || ""}`.toLowerCase().includes("musl")
  } catch { return false }
}

function getTarget() {
  const baseline = arch === "x64" && !supportsAvx2()
  const musl = isMusl()
  let target = `${platform}-${arch}`
  if (baseline) target += "-baseline"
  if (musl) target += "-musl"
  return target
}

function getTempDir() {
  const tmp = os.tmpdir()
  if (!tmp.includes(" ")) return tmp
  const fallback = path.join(path.parse(tmp).root, "octocode-temp")
  try { fs.mkdirSync(fallback, { recursive: true }) } catch {}
  return fallback
}

function fetchLatestVersion() {
  const r = childProcess.spawnSync("curl", ["-sL", "https://api.github.com/repos/farhanic017/octocode/releases/latest"], {
    encoding: "utf8", timeout: 10000, windowsHide: true,
  })
  if (r.status !== 0) return version
  try {
    const tag = JSON.parse(r.stdout).tag_name || ""
    return tag.replace(/^v/, "")
  } catch { return version }
}

function downloadSync(url, dest) {
  if (platform === "windows") {
    childProcess.execSync(
      `powershell.exe -NoProfile -NonInteractive -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${url}' -OutFile '${dest}' -UseBasicParsing"`,
      { stdio: "ignore", windowsHide: true, timeout: 300000 }
    )
  } else {
    const r = childProcess.spawnSync("curl", ["-sL", "-o", dest, url], {
      stdio: "ignore", timeout: 300000,
    })
    if (r.status !== 0) throw new Error("curl download failed")
  }
}

function downloadFromGitHub() {
  const target = getTarget()
  const ext = platform === "linux" ? ".tar.gz" : ".zip"
  const filename = `octo-${target}${ext}`

  let releaseVersion = version
  try { releaseVersion = fetchLatestVersion() } catch {}

  const url = `https://github.com/farhanic017/octocode/releases/download/v${releaseVersion}/${filename}`

  process.stdout.write(`Downloading ${filename}... `)
  const temp = fs.mkdtempSync(path.join(getTempDir(), "octocode-"))
  const archivePath = path.join(temp, filename)

  downloadSync(url, archivePath)

  const extractDir = path.join(temp, "extract")
  fs.mkdirSync(extractDir, { recursive: true })

  if (platform === "linux") {
    childProcess.spawnSync("tar", ["-xzf", archivePath, "-C", extractDir], { stdio: "ignore" })
  } else if (platform === "windows") {
    childProcess.spawnSync("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-Command",
      `Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}' -Force`
    ], { stdio: "ignore", windowsHide: true })
  } else {
    childProcess.spawnSync("unzip", ["-q", archivePath, "-d", extractDir], { stdio: "ignore" })
  }

  const extractedBinary = path.join(extractDir, sourceBinary)
  if (!fs.existsSync(extractedBinary)) {
    throw new Error(`Binary not found after extraction: ${extractedBinary}`)
  }

  fs.mkdirSync(path.dirname(targetBinary), { recursive: true })
  if (fs.existsSync(targetBinary)) fs.unlinkSync(targetBinary)
  fs.copyFileSync(extractedBinary, targetBinary)
  fs.chmodSync(targetBinary, 0o755)

  fs.rmSync(temp, { recursive: true, force: true })
  console.log("done")
}

function verifyBinary() {
  const r = childProcess.spawnSync(targetBinary, ["--version"], {
    encoding: "utf8", stdio: "ignore", windowsHide: true, shell: true,
  })
  return r.status === 0
}

function isInstalled() {
  if (!fs.existsSync(targetBinary)) return false
  const r = childProcess.spawnSync(targetBinary, ["--version"], {
    encoding: "utf8", stdio: "pipe", windowsHide: true, shell: true,
  })
  if (r.status !== 0) return false
  const installed = (r.stdout || "").trim()
  // Treat dev builds (0.0.0-*) as not installed so they get replaced
  if (installed.startsWith("0.0.0-")) return false
  return true
}

function main() {
  if (verifyBinary()) return

  // 1. Try local binary (monorepo/dev)
  const localPath = path.join(__dirname, "..", "dist", `octocode-${getTarget()}`, "bin", sourceBinary)
  if (fs.existsSync(localPath)) {
    fs.mkdirSync(path.dirname(targetBinary), { recursive: true })
    if (fs.existsSync(targetBinary)) fs.unlinkSync(targetBinary)
    fs.copyFileSync(localPath, targetBinary)
    fs.chmodSync(targetBinary, 0o755)
    if (verifyBinary()) return
  }

  // 2. Download from GitHub releases (synchronous)
  downloadFromGitHub()
  if (!verifyBinary()) throw new Error("Binary verification failed after download")
}

try {
  main()
} catch (error) {
  console.error(error.message)
  console.error("")
  console.error("Download manually from: https://github.com/farhanic017/octocode/releases")
  process.exit(1)
}
