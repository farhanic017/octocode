/*
 * OctoCode - Original UI/UX Design
 * Copyright (C) 2025 Farhan Dhrubo
 * Licensed under the GNU General Public License v3.0
 * https://www.gnu.org/licenses/gpl-3.0.html
 */

import { realpathSync } from "node:fs"
import { win32 } from "node:path"

export function normalizePath(input: string, platform: string) {
  if (platform !== "win32") return input
  const resolved = win32.normalize(win32.resolve(input.replaceAll("/", "\\")))
  try {
    return realpathSync.native(resolved)
  } catch {
    return resolved
  }
}
