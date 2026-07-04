export * as ConfigPaths from "./paths"

import path from "path"
import { Flag } from "@octocode-ai/core/flag/flag"
import { Global } from "@octocode-ai/core/global"
import { unique } from "remeda"
import * as Effect from "effect/Effect"
import { FSUtil } from "@octocode-ai/core/fs-util"

export const files = Effect.fn("ConfigPaths.projectFiles")(function* (
  name: string,
  directory: string,
  worktree?: string,
) {
  const afs = yield* FSUtil.Service
  const names = name === "octo" ? ["octo", "octocode"] : [name]
  return (yield* afs.up({
    targets: names.flatMap((item) => [`${item}.jsonc`, `${item}.json`]),
    start: directory,
    stop: worktree,
  })).toReversed()
})

export const directories = Effect.fn("ConfigPaths.directories")(function* (directory: string, worktree?: string) {
  const afs = yield* FSUtil.Service
  return unique([
    Global.Path.config,
    ...(!Flag.OCTOCODE_DISABLE_PROJECT_CONFIG
      ? yield* afs.up({
          targets: [".octo", ".octocode"],
          start: directory,
          stop: worktree,
        })
      : []),
    ...(yield* afs.up({
      targets: [".octo", ".octocode"],
      start: Global.Path.home,
      stop: Global.Path.home,
    })),
    ...(Flag.OCTOCODE_CONFIG_DIR ? [Flag.OCTOCODE_CONFIG_DIR] : []),
  ])
})

export function fileInDirectory(dir: string, name: string) {
  const names = name === "octo" ? ["octo", "octo"] : [name]
  return names.flatMap((item) => [path.join(dir, `${item}.json`), path.join(dir, `${item}.jsonc`)])
}
