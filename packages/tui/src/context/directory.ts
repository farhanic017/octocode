/*
 * OctoCode - Original UI/UX Design
 * Copyright (C) 2025 Farhan Dhrubo
 * Licensed under the GNU General Public License v3.0
 * https://www.gnu.org/licenses/gpl-3.0.html
 */

import { createMemo } from "solid-js"
import { useProject } from "./project"
import { useSync } from "./sync"
import { abbreviateHome } from "../runtime"
import { useTuiPaths } from "./runtime"

export function useDirectory() {
  const project = useProject()
  const sync = useSync()
  const paths = useTuiPaths()
  return createMemo(() => {
    const directory = project.instance.path().directory || paths.cwd
    const result = abbreviateHome(directory, paths.home)
    if (sync.data.vcs?.branch) return result + ":" + sync.data.vcs.branch
    return result
  })
}
