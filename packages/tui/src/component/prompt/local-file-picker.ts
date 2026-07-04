/*
 * OctoCode - Original UI/UX Design
 * Copyright (C) 2025 Farhan Dhrubo
 * Licensed under the GNU General Public License v3.0
 * https://www.gnu.org/licenses/gpl-3.0.html
 */

import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

function command(command: string, args: string[] = []) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk))
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk))
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) return resolve(Buffer.concat(stdout).toString("utf8"))
      if (code === 1) return resolve("")
      reject(new Error(Buffer.concat(stderr).toString("utf8").trim() || `${command} exited with code ${code}`))
    })
  })
}

function lines(output: string) {
  return output
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getStatePath(): string {
  const dir = process.platform === "win32"
    ? join(homedir(), "AppData", "Local", "octo")
    : join(homedir(), ".local", "share", "octo")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, "file-picker-state.json")
}

function readLastDir(): string | null {
  try {
    const data = JSON.parse(readFileSync(getStatePath(), "utf8"))
    return typeof data.lastDir === "string" && existsSync(data.lastDir) ? data.lastDir : null
  } catch {
    return null
  }
}

function saveLastDir(dir: string) {
  try {
    writeFileSync(getStatePath(), JSON.stringify({ lastDir: dir }))
  } catch {}
}

function getInitialDir(cwd: string): string {
  const lastDir = readLastDir()
  if (lastDir) return lastDir
  if (process.platform === "win32") {
    const pictures = join(homedir(), "Pictures")
    if (existsSync(pictures)) return pictures
  }
  if (process.platform === "darwin") {
    const pictures = join(homedir(), "Pictures")
    if (existsSync(pictures)) return pictures
  }
  return cwd
}

function windowsScript(initialDir: string) {
  const escapedDir = initialDir.replace(/'/g, "''")
  return `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Multiselect = $true
$dialog.CheckFileExists = $true
$dialog.Title = 'Attach files'
$dialog.InitialDirectory = '${escapedDir}'
$dialog.Filter = 'Supported files|*.png;*.jpg;*.jpeg;*.gif;*.webp;*.avif;*.svg;*.bmp;*.tif;*.tiff;*.heic;*.heif;*.mp4;*.mov;*.mkv;*.webm;*.avi;*.m4v;*.mpeg;*.mpg;*.mp3;*.wav;*.m4a;*.aac;*.flac;*.ogg;*.pdf;*.doc;*.docx;*.xls;*.xlsx;*.ppt;*.pptx;*.odt;*.ods;*.odp;*.rtf;*.txt;*.md;*.markdown;*.csv;*.json;*.jsonl;*.log|All files|*.*'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  $dialog.FileNames | ForEach-Object { [Console]::WriteLine($_) }
  $selectedDir = [System.IO.Path]::GetDirectoryName($dialog.FileNames[0])
  $statePath = Join-Path $env:USERPROFILE 'AppData\\Local\\octo\\file-picker-state.json'
  $stateDir = [System.IO.Path]::GetDirectoryName($statePath)
  if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Path $stateDir -Force | Out-Null }
  Set-Content -Path $statePath -Value ('{"lastDir":"' + ($selectedDir -replace '\\\\','\\\\') + '"}') -Force
}
`.trim()
}

export async function openLocalFilePicker(input: { platform: string; cwd: string }) {
  if (input.platform === "win32") {
    const initialDir = getInitialDir(input.cwd)
    const output = await command("powershell.exe", ["-NoProfile", "-STA", "-Command", windowsScript(initialDir)])
    return lines(output)
  }

  if (input.platform === "darwin") {
    const initialDir = getInitialDir(input.cwd)
    const output = await command("osascript", [
      "-e",
      `set initialDir to POSIX file "${initialDir}" as alias`,
      "-e",
      "set selectedFiles to choose file with multiple selections allowed default location initialDir",
      "-e",
      'set output to ""',
      "-e",
      'repeat with selectedFile in selectedFiles',
      "-e",
      'set output to output & POSIX path of selectedFile & linefeed',
      "-e",
      "end repeat",
      "-e",
      "return output",
    ])
    const result = lines(output)
    if (result.length > 0) {
      const dir = result[0].replace(/\/[^/]*$/, "")
      if (dir) saveLastDir(dir)
    }
    return result
  }

  try {
    const initialDir = getInitialDir(input.cwd)
    const output = await command("zenity", [
      "--file-selection", "--multiple", "--separator=\n", "--title=Attach files",
      `--filename=${initialDir}/`,
    ])
    const result = lines(output)
    if (result.length > 0) {
      const dir = result[0].replace(/\/[^/]*$/, "")
      if (dir) saveLastDir(dir)
    }
    return result
  } catch {
    const initialDir = getInitialDir(input.cwd)
    const output = await command("kdialog", [
      "--multiple", "--separate-output", "--getopenfilename", initialDir,
    ])
    const result = lines(output)
    if (result.length > 0) {
      const dir = result[0].replace(/\/[^/]*$/, "")
      if (dir) saveLastDir(dir)
    }
    return result
  }
}

export function openLocalFile(input: { platform: string; path: string }) {
  if (!input.path) return
  if (input.platform === "win32") {
    const escaped = input.path.replace(/'/g, "''")
    spawn("powershell.exe", ["-NoProfile", "-Command", `Start-Process -LiteralPath '${escaped}'`], {
      detached: true,
      stdio: "ignore",
    }).unref()
    return
  }
  if (input.platform === "darwin") {
    spawn("open", [input.path], { detached: true, stdio: "ignore" }).unref()
    return
  }
  spawn("xdg-open", [input.path], { detached: true, stdio: "ignore" }).unref()
}
