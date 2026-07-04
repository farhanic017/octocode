import { FrameBufferRenderable, RGBA, TextAttributes, type OptimizedBuffer, type RenderContext, type RenderableOptions } from "@opentui/core"
import { extend } from "@opentui/solid"
import { spawn } from "node:child_process"

type Pixel = readonly [r: number, g: number, b: number, a: number]
type Thumbnail = {
  width: number
  height: number
  pixels: Uint8Array
}

type AttachmentThumbnailOptions = RenderableOptions<FrameBufferRenderable> & {
  dataUrl?: string
  filePath?: string
  fallbackBg?: RGBA
  border?: RGBA
}

const TOP_HALF = "\u2580".charCodeAt(0)
const SPACE = " ".charCodeAt(0)

const cache = new Map<string, Promise<Thumbnail | undefined>>()

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
      reject(new Error(Buffer.concat(stderr).toString("utf8").trim() || `${command} exited with code ${code}`))
    })
  })
}

function windowsThumbnailScript(filePath: string, width: number, height: number) {
  const escaped = filePath.replace(/'/g, "''")
  return `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${escaped}')
try {
  $thumb = New-Object System.Drawing.Bitmap(${width}, ${height}, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($thumb)
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(8, 8, 8))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $scale = [Math]::Max(${width} / $src.Width, ${height} / $src.Height)
    $drawWidth = [Math]::Max(1, [int]($src.Width * $scale))
    $drawHeight = [Math]::Max(1, [int]($src.Height * $scale))
    $x = [int]((${width} - $drawWidth) / 2)
    $y = [int]((${height} - $drawHeight) / 2)
    $graphics.DrawImage($src, $x, $y, $drawWidth, $drawHeight)
    $bytes = New-Object byte[] (${width} * ${height} * 4)
    $i = 0
    for ($py = 0; $py -lt ${height}; $py++) {
      for ($px = 0; $px -lt ${width}; $px++) {
        $c = $thumb.GetPixel($px, $py)
        $bytes[$i++] = $c.R
        $bytes[$i++] = $c.G
        $bytes[$i++] = $c.B
        $bytes[$i++] = $c.A
      }
    }
    [Console]::Write([Convert]::ToBase64String($bytes))
  } finally {
    $graphics.Dispose()
    $thumb.Dispose()
  }
} finally {
  $src.Dispose()
}
`.trim()
}

function average(pixels: Uint8Array, width: number, height: number, x0: number, y0: number, x1: number, y1: number): Pixel {
  let r = 0
  let g = 0
  let b = 0
  let a = 0
  let count = 0
  const minX = Math.max(0, Math.floor(x0))
  const maxX = Math.min(width, Math.max(minX + 1, Math.ceil(x1)))
  const minY = Math.max(0, Math.floor(y0))
  const maxY = Math.min(height, Math.max(minY + 1, Math.ceil(y1)))
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const offset = (y * width + x) * 4
      r += pixels[offset] ?? 0
      g += pixels[offset + 1] ?? 0
      b += pixels[offset + 2] ?? 0
      a += pixels[offset + 3] ?? 255
      count++
    }
  }
  if (!count) return [0, 0, 0, 255]
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count), Math.round(a / count)]
}

async function decodeThumbnail(input: { dataUrl?: string; filePath?: string; width: number; height: number }): Promise<Thumbnail | undefined> {
  const key = `${input.filePath ?? input.dataUrl?.slice(0, 96)}:${input.dataUrl?.length ?? 0}:${input.width}x${input.height}`
  const existing = cache.get(key)
  if (existing) return existing
  const promise = (async () => {
    try {
      if (process.platform === "win32" && input.filePath) {
        const output = await command("powershell.exe", [
          "-NoProfile",
          "-STA",
          "-Command",
          windowsThumbnailScript(input.filePath, input.width, input.height),
        ])
        return {
          width: input.width,
          height: input.height,
          pixels: Uint8Array.from(Buffer.from(output.trim(), "base64")),
        }
      }
      return undefined
    } catch {
      return undefined
    }
  })()
  cache.set(key, promise)
  return promise
}

class AttachmentThumbnailRenderable extends FrameBufferRenderable {
  private thumbnail?: Thumbnail
  private failed = false
  private fallbackBg = RGBA.fromHex("#080808")
  private border = RGBA.fromHex("#343434")

  constructor(ctx: RenderContext, options: AttachmentThumbnailOptions = {}) {
    super(ctx, {
      ...options,
      width: typeof options.width === "number" ? options.width : 10,
      height: typeof options.height === "number" ? options.height : 5,
      respectAlpha: false,
    })
    if (options.width !== undefined && typeof options.width !== "number") this.width = options.width
    if (options.height !== undefined && typeof options.height !== "number") this.height = options.height
    if (options.fallbackBg) this.fallbackBg = options.fallbackBg
    if (options.border) this.border = options.border
    if (options.dataUrl || options.filePath) this.load({ dataUrl: options.dataUrl, filePath: options.filePath })
  }

  set dataUrl(value: string | undefined) {
    if (value) this.load({ dataUrl: value })
  }

  set filePath(value: string | undefined) {
    if (value) this.load({ filePath: value })
  }

  private load(value: { dataUrl?: string; filePath?: string }) {
    void decodeThumbnail({ ...value, width: this.width, height: this.height * 2 }).then((thumbnail) => {
      if (!thumbnail) this.failed = true
      else this.thumbnail = thumbnail
      this.requestRender()
    })
  }

  protected override renderSelf(buffer: OptimizedBuffer): void {
    if (!this.visible || this.isDestroyed) return
    const fb = this.frameBuffer
    const width = fb.width
    const height = fb.height
    const buffers = fb.buffers
    buffers.char.fill(SPACE)
    buffers.attributes.fill(0)
    for (let index = 0; index < width * height; index++) {
      const offset = index * 4
      buffers.bg[offset] = this.fallbackBg.r
      buffers.bg[offset + 1] = this.fallbackBg.g
      buffers.bg[offset + 2] = this.fallbackBg.b
      buffers.bg[offset + 3] = 255
      buffers.fg[offset] = this.border.r
      buffers.fg[offset + 1] = this.border.g
      buffers.fg[offset + 2] = this.border.b
      buffers.fg[offset + 3] = 255
    }

    if (!this.thumbnail || this.failed) {
      super.renderSelf(buffer)
      return
    }

    const source = this.thumbnail
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x
        const offset = index * 4
        const sx0 = (x / width) * source.width
        const sx1 = ((x + 1) / width) * source.width
        const sy0Top = ((y * 2) / (height * 2)) * source.height
        const sy1Top = (((y * 2) + 1) / (height * 2)) * source.height
        const sy0Bottom = sy1Top
        const sy1Bottom = (((y * 2) + 2) / (height * 2)) * source.height
        const top = average(source.pixels, source.width, source.height, sx0, sy0Top, sx1, sy1Top)
        const bottom = average(source.pixels, source.width, source.height, sx0, sy0Bottom, sx1, sy1Bottom)
        buffers.char[index] = TOP_HALF
        buffers.attributes[index] = TextAttributes.NONE
        buffers.fg[offset] = top[0]
        buffers.fg[offset + 1] = top[1]
        buffers.fg[offset + 2] = top[2]
        buffers.fg[offset + 3] = top[3]
        buffers.bg[offset] = bottom[0]
        buffers.bg[offset + 1] = bottom[1]
        buffers.bg[offset + 2] = bottom[2]
        buffers.bg[offset + 3] = bottom[3]
      }
    }
    super.renderSelf(buffer)
  }
}

declare module "@opentui/solid" {
  interface OpenTUIComponents {
    attachment_thumbnail: typeof AttachmentThumbnailRenderable
  }
}

extend({ attachment_thumbnail: AttachmentThumbnailRenderable })
