/*
 * OctoCode - Original UI/UX Design
 * Copyright (C) 2025 Farhan Dhrubo
 * Licensed under the GNU General Public License v3.0
 * https://www.gnu.org/licenses/gpl-3.0.html
 */

import { blend, hexToOklch, shift } from "../color"
import type { ColorValue, HexColor, V2ColorValue } from "../types"

export function mapV2Foreground(
  ink: HexColor,
  isDark: boolean,
  overrides: Record<string, ColorValue> = {},
): Record<string, V2ColorValue> {
  const tint = hexToOklch(ink)
  const body = shift(ink, {
    l: isDark ? Math.max(0, 0.88 - tint.l) * 0.4 : -Math.max(0, tint.l - 0.18) * 0.24,
    c: isDark ? 1.04 : 1.02,
  })

  return {
    "v2-text-text-base": isDark ? blend("#ffffff", body, 0.9) : shift(body, { l: -0.07, c: 1.04 }),
    "v2-text-text-muted": overrides["text-weak"] ?? shift(body, { l: isDark ? -0.11 : 0.11, c: 0.9 }),
    "v2-text-text-faint": shift(body, { l: isDark ? -0.2 : 0.21, c: isDark ? 0.78 : 0.72 }),
  }
}

