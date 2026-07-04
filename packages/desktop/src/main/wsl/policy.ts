import type { WslDistroProbe, WslOctocodeCheck, WslServerItem } from "../../preload/types"

export function wslServerIdToRestart(servers: WslServerItem[], distro: string) {
  return servers.find((item) => item.config.distro === distro)?.config.id
}

export function clearWslDistroState(
  distroProbes: Record<string, WslDistroProbe>,
  octocodeChecks: Record<string, WslOctocodeCheck>,
  distro: string,
) {
  const nextDistroProbes = { ...distroProbes }
  const nextOctocodeChecks = { ...octocodeChecks }
  delete nextDistroProbes[distro]
  delete nextOctocodeChecks[distro]
  return { distroProbes: nextDistroProbes, octocodeChecks: nextOctocodeChecks }
}

export function wslTerminalArgs(distro?: string | null) {
  return ["/c", "start", "", "wsl", ...(distro ? ["-d", distro] : [])]
}

export function requireWslIpcString(name: string, value: unknown) {
  if (typeof value === "string" && value.length > 0) return value
  throw new Error(`Invalid ${name}`)
}
