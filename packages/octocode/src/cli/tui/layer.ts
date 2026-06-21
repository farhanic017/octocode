import { run as runTui, type TuiInput } from "@octocode-ai/tui"
import { Global } from "@octocode-ai/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}
