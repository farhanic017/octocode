/*
 * OctoCode - Original UI/UX Design
 * Copyright (C) 2025 Farhan Dhrubo
 * Licensed under the GNU General Public License v3.0
 * https://www.gnu.org/licenses/gpl-3.0.html
 */

import { readFile, stat } from "node:fs/promises"
import path from "node:path"

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024

const EXECUTABLE_SIGNATURES = [
  new Uint8Array([0x7f, 0x45, 0x4c, 0x46]),
  new Uint8Array([0x4d, 0x5a]),
  new Uint8Array([0xcf, 0xfa, 0xed, 0xfe]),
  new Uint8Array([0xfe, 0xed, 0xfa, 0xce]),
  new Uint8Array([0xfe, 0xed, 0xfa, 0xcf]),
  new Uint8Array([0xca, 0xfe, 0xba, 0xbe]),
]

export type LocalFiles = Readonly<{
  readText(path: string): Promise<string>
  readBytes(path: string): Promise<Uint8Array>
  mime(path: string): Promise<string>
}>

export type LocalAttachment =
  | Readonly<{ type: "text"; mime: "image/svg+xml"; content: string }>
  | Readonly<{ type: "binary"; mime: string; content: Uint8Array }>

export function readLocalAttachment(file: string) {
  return readLocalAttachmentWith(
    {
      readText: (value) => readFile(value, "utf8"),
      readBytes: (value) => readFile(value),
      mime: async (value) => mimeTypes[path.extname(value).toLowerCase()] ?? "application/octet-stream",
    },
    file,
  )
}

const mimeTypes: Record<string, string> = {
  ".aac": "audio/aac",
  ".avif": "image/avif",
  ".avi": "video/x-msvideo",
  ".bmp": "image/bmp",
  ".csv": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".flac": "audio/flac",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "text/plain",
  ".jsonl": "text/plain",
  ".log": "text/plain",
  ".m4a": "audio/mp4",
  ".m4v": "video/mp4",
  ".markdown": "text/plain",
  ".md": "text/plain",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".rtf": "application/rtf",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".txt": "text/plain",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

const documentMimes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/rtf",
  "text/plain",
])

function hasExecutableSignature(header: Uint8Array): boolean {
  for (const sig of EXECUTABLE_SIGNATURES) {
    if (header.length >= sig.length) {
      let match = true
      for (let i = 0; i < sig.length; i++) {
        if (header[i] !== sig[i]) { match = false; break }
      }
      if (match) return true
    }
  }
  return false
}

export async function readLocalAttachmentWith(files: LocalFiles, path: string): Promise<LocalAttachment | undefined> {
  const mime = await files.mime(path).catch(() => undefined)
  if (!mime) return
  const info = await stat(path).catch(() => undefined)
  if (!info || info.size > MAX_ATTACHMENT_SIZE) return
  if (mime === "image/svg+xml") {
    const content = await files.readText(path).catch(() => undefined)
    if (!content) return
    return { type: "text", mime, content }
  }
  if (!mime.startsWith("image/") && !mime.startsWith("video/") && !mime.startsWith("audio/") && !documentMimes.has(mime))
    return
  const content = await files.readBytes(path).catch(() => undefined)
  if (!content) return
  if (content.length >= 4 && hasExecutableSignature(content.subarray(0, 4))) return
  return { type: "binary", mime, content }
}
