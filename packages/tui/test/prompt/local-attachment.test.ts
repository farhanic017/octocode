import { describe, expect, test } from "bun:test"
import { readLocalAttachmentWith } from "../../src/component/prompt/local-attachment"
import type { LocalFiles } from "../../src/component/prompt/local-attachment"
import os from "node:os"
import path from "node:path"

const tmpDir = path.join(os.tmpdir(), "octocode-test-attachments")

function files(input: { mime: string; text?: string; bytes?: Uint8Array }): LocalFiles {
  return {
    mime: async () => input.mime,
    readText: async () => input.text ?? "",
    readBytes: async () => input.bytes ?? new Uint8Array(),
  }
}

async function tmpFile(name: string, content: string | Uint8Array): Promise<string> {
  await Bun.write(path.join(tmpDir, name), content)
  return path.join(tmpDir, name)
}

describe("prompt local attachments", () => {
  test("reads SVG attachments as text", async () => {
    const filePath = await tmpFile("image.svg", "<svg />")
    expect(await readLocalAttachmentWith(files({ mime: "image/svg+xml", text: "<svg />" }), filePath)).toEqual({
      type: "text",
      mime: "image/svg+xml",
      content: "<svg />",
    })
  })

  test("reads upload attachment categories as bytes", async () => {
    const content = new Uint8Array([1, 2, 3])
    const pdfPath = await tmpFile("file.pdf", content)
    expect(await readLocalAttachmentWith(files({ mime: "application/pdf", bytes: content }), pdfPath)).toEqual({
      type: "binary",
      mime: "application/pdf",
      content,
    })
    const mp4Path = await tmpFile("file.mp4", content)
    expect(await readLocalAttachmentWith(files({ mime: "video/mp4", bytes: content }), mp4Path)).toEqual({
      type: "binary",
      mime: "video/mp4",
      content,
    })
    const mp3Path = await tmpFile("file.mp3", content)
    expect(
      await readLocalAttachmentWith(files({ mime: "audio/mpeg", bytes: content }), mp3Path),
    ).toEqual({
      type: "binary",
      mime: "audio/mpeg",
      content,
    })
    const txtPath = await tmpFile("file.txt", content)
    expect(await readLocalAttachmentWith(files({ mime: "text/plain", bytes: content }), txtPath)).toEqual({
      type: "binary",
      mime: "text/plain",
      content,
    })
    const docxPath = await tmpFile("file.docx", content)
    expect(
      await readLocalAttachmentWith(
        files({
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          bytes: content,
        }),
        docxPath,
      ),
    ).toEqual({
      type: "binary",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content,
    })
  })

  test("ignores unsupported and unreadable local files", async () => {
    const binPath = await tmpFile("file.bin", "")
    expect(await readLocalAttachmentWith(files({ mime: "application/octet-stream" }), binPath)).toBeUndefined()
    expect(
      await readLocalAttachmentWith(
        {
          ...files({ mime: "image/png" }),
          readBytes: async () => Promise.reject(new Error("missing")),
        },
        "/tmp/missing.png",
      ),
    ).toBeUndefined()
  })
})
