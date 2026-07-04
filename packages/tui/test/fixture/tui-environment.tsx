/** @jsxImportSource @opentui/solid */
import {
  TuiPathsProvider,
  TuiStartupProvider,
  TuiTerminalEnvironmentProvider,
  type TuiPaths,
} from "../../src/context/runtime"
import type { ParentProps } from "solid-js"
import os from "node:os"
import path from "node:path"

const tmpBase = path.join(os.tmpdir(), "octocode-test")

export function TestTuiContexts(
  props: ParentProps<{
    cwd?: string
    directory?: string
    paths?: Partial<TuiPaths>
  }>,
) {
  return (
    <TuiPathsProvider
      value={{
        cwd: props.cwd ?? props.directory ?? path.join(tmpBase, "packages", "tui"),
        home: path.join(tmpBase, "home"),
        state: path.join(tmpBase, "state"),
        worktree: tmpBase,
        ...props.paths,
      }}
    >
      <TuiTerminalEnvironmentProvider value={{ platform: "linux" }}>
        <TuiStartupProvider value={{ skipInitialLoading: false }}>{props.children}</TuiStartupProvider>
      </TuiTerminalEnvironmentProvider>
    </TuiPathsProvider>
  )
}
