export function rawToBase64(data: Buffer, width: number, height: number, channels: number): string {
  const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = channels === 4 ? 6 : 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const raw: number[] = []
  for (let y = 0; y < height; y++) {
    raw.push(0)
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels
      for (let c = 0; c < channels; c++) {
        raw.push(data[offset + c])
      }
    }
  }

  const zlib = require("zlib")
  const compressed = zlib.deflateSync(Buffer.from(raw))

  function crc32(buf: Buffer): number {
    let c = 0xffffffff
    const table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let v = n
      for (let k = 0; k < 8; k++) {
        v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1
      }
      table[n] = v
    }
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    }
    return (c ^ 0xffffffff) >>> 0
  }

  function chunk(type: string, chunkData: Buffer): Buffer {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(chunkData.length)
    const typeAndData = Buffer.concat([Buffer.from(type), chunkData])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(typeAndData))
    return Buffer.concat([len, typeAndData, crc])
  }

  const ihdrChunk = chunk("IHDR", ihdr)
  const idatChunk = chunk("IDAT", compressed)
  const iendChunk = chunk("IEND", Buffer.alloc(0))

  const png = Buffer.concat([PNG_HEADER, ihdrChunk, idatChunk, iendChunk])
  return png.toString("base64")
}

export async function captureScreenBase64(): Promise<string> {
  const { screen } = await import("@nut-tree-fork/nut-js")
  const img = await screen.grab()
  return rawToBase64(img.data, img.width, img.height, img.channels)
}
