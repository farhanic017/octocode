import { describe, expect, test } from "bun:test"
import { readLocalAttachmentWith } from "../../src/component/prompt/local-attachment"
import type { LocalFiles } from "../../src/component/prompt/local-attachment"

function files(input: { mime: string; text?: string; bytes?: Uint8Array }): LocalFiles {
  return {
    mime: async () => input.mime,
    readText: async () => input.text ?? "",
    readBytes: async () => input.bytes ?? new Uint8Array(),
  }
}

describe("prompt local attachments", () => {
  test("reads SVG attachments as text", async () => {
    expect(await readLocalAttachmentWith(files({ mime: "image/svg+xml", text: "<svg />" }), "/tmp/image.svg")).toEqual({
      type: "text",
      mime: "image/svg+xml",
      content: "<svg />",
    })
  })

  test("reads upload attachment categories as bytes", async () => {
    const content = new Uint8Array([1, 2, 3])
    expect(await readLocalAttachmentWith(files({ mime: "application/pdf", bytes: content }), "/tmp/file.pdf")).toEqual({
      type: "binary",
      mime: "application/pdf",
      content,
    })
    expect(await readLocalAttachmentWith(files({ mime: "video/mp4", bytes: content }), "/tmp/file.mp4")).toEqual({
      type: "binary",
      mime: "video/mp4",
      content,
    })
    expect(
      await readLocalAttachmentWith(files({ mime: "audio/mpeg", bytes: content }), "/tmp/file.mp3"),
    ).toEqual({
      type: "binary",
      mime: "audio/mpeg",
      content,
    })
    expect(await readLocalAttachmentWith(files({ mime: "text/plain", bytes: content }), "/tmp/file.txt")).toEqual({
      type: "binary",
      mime: "text/plain",
      content,
    })
    expect(
      await readLocalAttachmentWith(
        files({
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          bytes: content,
        }),
        "/tmp/file.docx",
      ),
    ).toEqual({
      type: "binary",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content,
    })
  })

  test("ignores unsupported and unreadable local files", async () => {
    expect(await readLocalAttachmentWith(files({ mime: "application/octet-stream" }), "/tmp/file.bin")).toBeUndefined()
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
