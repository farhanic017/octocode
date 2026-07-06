// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
const sharp = require("sharp")
const crypto = require("crypto")

let _lastHash = null

async function optimizeScreenshot(rawBase64) {
  const inputBuffer = Buffer.from(rawBase64, "base64")

  const hash = crypto.createHash("md5").update(inputBuffer).digest("hex")
  if (hash === _lastHash) {
    return { base64: null, width: 0, height: 0, sizeBytes: 0, duplicate: true }
  }
  _lastHash = hash

  try {
    const metadata = await sharp(inputBuffer).metadata()
    const maxWidth = 1024
    const resizeOptions = metadata.width > maxWidth
      ? { width: maxWidth, kernel: sharp.kernel.lanczos3 }
      : undefined

    const optimized = await sharp(inputBuffer)
      .resize(resizeOptions)
      .jpeg({ quality: 75, chromaSubsampling: "4:2:0" })
      .toBuffer()

    const result = await sharp(optimized).metadata()

    return {
      base64: optimized.toString("base64"),
      width: result.width,
      height: result.height,
      sizeBytes: optimized.length,
      duplicate: false,
    }
  } catch {
    return { base64: rawBase64, width: 0, height: 0, sizeBytes: inputBuffer.length, duplicate: false }
  }
}

function resetHash() {
  _lastHash = null
}

module.exports = { optimizeScreenshot, resetHash }
