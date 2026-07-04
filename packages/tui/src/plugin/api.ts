/*
 * OctoCode - Original UI/UX Design
 * Copyright (C) 2025 Farhan Dhrubo
 * Licensed under the GNU General Public License v3.0
 * https://www.gnu.org/licenses/gpl-3.0.html
 */

import type { TuiPluginApi, TuiRouteDefinition } from "@octocode-ai/plugin/tui"
import { createSignal } from "solid-js"

type RouteEntry = {
  key: symbol
  render: TuiRouteDefinition["render"]
}

export type RouteMap = Map<string, RouteEntry[]>

export function createPluginRoutes() {
  const routes: RouteMap = new Map()
  const [revision, setRevision] = createSignal(0)

  return {
    register(list: TuiRouteDefinition[]) {
      const key = Symbol()
      list.forEach((item) => routes.set(item.name, [...(routes.get(item.name) ?? []), { key, render: item.render }]))
      setRevision((value) => value + 1)

      return () => {
        list.forEach((item) => {
          const next = routes.get(item.name)?.filter((entry) => entry.key !== key) ?? []
          if (next.length) {
            routes.set(item.name, next)
            return
          }
          routes.delete(item.name)
        })
        setRevision((value) => value + 1)
      }
    },
    get(name: string) {
      revision()
      return routes.get(name)?.at(-1)?.render
    },
  }
}

export type PluginRoutes = ReturnType<typeof createPluginRoutes>

export function createTuiApi(input: Omit<TuiPluginApi, "lifecycle">): TuiPluginApi {
  return {
    ...input,
    lifecycle: {
      signal: new AbortController().signal,
      onDispose() {
        return () => {}
      },
    },
  }
}
