import type { WslOctocodeCheck, WslServerRuntime } from "./types"

export const wslRuntimeRetryable = (runtime: WslServerRuntime) =>
  runtime.kind === "failed" || runtime.kind === "stopped"

export async function enterWslOctocodeStep(
  distro: string,
  probe: (distro: string) => Promise<unknown>,
  select: (step: "octo") => void,
) {
  await probe(distro)
  select("octo")
}

export function wslOctocodeAction(check?: WslOctocodeCheck) {
  if (!check) return
  if (!check.resolvedPath) return "Install OctoCode"
  if (check.matchesDesktop === false) return "Update OctoCode"
}
