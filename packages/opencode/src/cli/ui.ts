import z from "zod"
import { EOL } from "os"
import { NamedError } from "@octo-ai/shared/util/error"
import { logo as glyphs } from "./logo"

const wordmark = [
  `⠀                                       `,
  `█▀▄▀█ █ █▄ ▄█ █▀▀█ █▀▀ █▀▀█ █▀▀▄ █▀▀▀`,
  `█ ▀ █ █ █ ▀ █ █  █ █   █  █ █  █ █▀▀ `,
  `▀   ▀ ▀ ▀   ▀ ▀▀▀▀ ▀▀▀ ▀▀▀▀ ▀▀▀  ▀▀▀▀`,
]

export const CancelledError = NamedError.create("UICancelledError", z.void())

export const Style = {
  TEXT_HIGHLIGHT: "\x1b[96m",
  TEXT_HIGHLIGHT_BOLD: "\x1b[96m\x1b[1m",
  TEXT_DIM: "\x1b[90m",
  TEXT_DIM_BOLD: "\x1b[90m\x1b[1m",
  TEXT_NORMAL: "\x1b[0m",
  TEXT_NORMAL_BOLD: "\x1b[1m",
  TEXT_WARNING: "\x1b[93m",
  TEXT_WARNING_BOLD: "\x1b[93m\x1b[1m",
  TEXT_DANGER: "\x1b[91m",
  TEXT_DANGER_BOLD: "\x1b[91m\x1b[1m",
  TEXT_SUCCESS: "\x1b[92m",
  TEXT_SUCCESS_BOLD: "\x1b[92m\x1b[1m",
  TEXT_INFO: "\x1b[94m",
  TEXT_INFO_BOLD: "\x1b[94m\x1b[1m",
}

export function println(...message: string[]) {
  print(...message)
  process.stderr.write(EOL)
}

export function print(...message: string[]) {
  blank = false
  process.stderr.write(message.join(" "))
}

let blank = false
export function empty() {
  if (blank) return
  println("" + Style.TEXT_NORMAL)
  blank = true
}

export function logo(pad?: string) {
  const lines = glyphs.lines ?? []

  if (!process.stdout.isTTY && !process.stderr.isTTY) {
    const result: string[] = []
    for (const row of lines) {
      if (pad) result.push(pad)
      result.push(row)
      result.push(EOL)
    }
    return result.join("").trimEnd()
  }

  const result: string[] = []
  const reset = "\x1b[0m"
  const dim = "\x1b[90m"
  for (const row of lines) {
    if (pad) result.push(pad)
    result.push(dim, row, reset, EOL)
  }
  return result.join("").trimEnd()
}

export async function input(prompt: string): Promise<string> {
  const readline = require("readline")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export function error(message: string) {
  if (message.startsWith("Error: ")) {
    message = message.slice("Error: ".length)
  }
  println(Style.TEXT_DANGER_BOLD + "Error: " + Style.TEXT_NORMAL + message)
}

export function markdown(text: string): string {
  return text
}

export * as UI from "./ui"
