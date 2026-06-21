import { spawn } from "node:child_process"

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

function windowsScript(cwd: string) {
  const escapedCwd = cwd.replace(/'/g, "''")
  return `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Multiselect = $true
$dialog.CheckFileExists = $true
$dialog.Title = 'Attach files'
$dialog.InitialDirectory = '${escapedCwd}'
$dialog.Filter = 'Supported files|*.png;*.jpg;*.jpeg;*.gif;*.webp;*.avif;*.svg;*.bmp;*.tif;*.tiff;*.heic;*.heif;*.mp4;*.mov;*.mkv;*.webm;*.avi;*.m4v;*.mpeg;*.mpg;*.mp3;*.wav;*.m4a;*.aac;*.flac;*.ogg;*.pdf;*.doc;*.docx;*.xls;*.xlsx;*.ppt;*.pptx;*.odt;*.ods;*.odp;*.rtf;*.txt;*.md;*.markdown;*.csv;*.json;*.jsonl;*.log|All files|*.*'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  $dialog.FileNames | ForEach-Object { [Console]::WriteLine($_) }
}
`.trim()
}

export async function openLocalFilePicker(input: { platform: string; cwd: string }) {
  if (input.platform === "win32") {
    const output = await command("powershell.exe", ["-NoProfile", "-STA", "-Command", windowsScript(input.cwd)])
    return lines(output)
  }

  if (input.platform === "darwin") {
    const output = await command("osascript", [
      "-e",
      'set selectedFiles to choose file with multiple selections allowed',
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
    return lines(output)
  }

  try {
    const output = await command("zenity", ["--file-selection", "--multiple", "--separator=\n", "--title=Attach files"])
    return lines(output)
  } catch {
    const output = await command("kdialog", ["--multiple", "--separate-output", "--getopenfilename", input.cwd])
    return lines(output)
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
