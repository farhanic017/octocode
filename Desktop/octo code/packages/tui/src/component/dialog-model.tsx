import { createMemo, createSignal } from "solid-js"
import { useLocal } from "../context/local"
import { useSync } from "../context/sync"
import { map, pipe, flatMap, entries, filter, sortBy, take } from "remeda"
import { DialogSelect, type DialogSelectOption } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"
import { createDialogProviderOptions, DialogProvider } from "./dialog-provider"
import { DialogVariant } from "./dialog-variant"
import * as fuzzysort from "fuzzysort"
import { useConnected } from "./use-connected"
import { useTheme } from "../context/theme"

export function DialogModel(props: { providerID?: string }) {
  const local = useLocal()
  const sync = useSync()
  const dialog = useDialog()
  dialog.setSize("large")
  const [query, setQuery] = createSignal("")
  const [tab, setTab] = createSignal<"all" | "favorite" | "free" | "hidden">("all")

  const connected = useConnected()
  const { theme } = useTheme()
  const providers = createDialogProviderOptions()

  const showExtra = createMemo(() => connected() && !props.providerID)

  function createHideToggle(providerID: string, modelID: string) {
    return [{
      checked: () => local.model.hidden().some((h) => h.providerID === providerID && h.modelID === modelID),
      onTrigger: () => {
        local.model.toggleHidden({ providerID, modelID })
      },
    }]
  }

  const options = createMemo(() => {
    const needle = query().trim()
    const showSections = showExtra() && needle.length === 0
    const favorites = connected() ? local.model.favorite() : []
    const recents = local.model.recent()
    const hidden = connected() ? local.model.hidden() : []

    function toOptions(items: typeof favorites, category: string) {
      if (!showSections) return []
      return items.flatMap((item) => {
        const provider = sync.data.provider.find((x) => x.id === item.providerID)
        if (!provider) return []
        const model = provider.models[item.modelID]
        if (!model) return []
        return [
          {
            key: item,
            value: { providerID: provider.id, modelID: model.id },
            title: model.name ?? item.modelID,
            description: provider.name,
            category,
            disabled: provider.id === "opencode" && model.id.includes("-nano"),
            footer: model.cost?.input === 0 ? "Free" : undefined,
            gutter:
              category === "Favorites"
                ? () => <text fg={theme.warning}>★</text>
                : category === "Hidden"
                  ? () => <box borderStyle="rounded" borderColor={theme.error} width={3} height={1} flexDirection="row" alignItems="center" justifyContent="center"><text fg={theme.error}> </text></box>
                  : undefined,
            rowActions: createHideToggle(provider.id, model.id),
            onSelect: () => {
              onSelect(provider.id, model.id)
            },
          },
        ]
      })
    }

    const favoriteOptions = toOptions(favorites, "Favorites")
    const recentOptions = toOptions(
      recents.filter(
        (item) => !favorites.some((fav) => fav.providerID === item.providerID && fav.modelID === item.modelID),
      ),
      "Recent",
    )

    const hiddenOptions = toOptions(
      hidden.filter(
        (item) =>
          !favorites.some((fav) => fav.providerID === item.providerID && fav.modelID === item.modelID) &&
          !recents.some((rec) => rec.providerID === item.providerID && rec.modelID === item.modelID),
      ),
      "Hidden",
    )

    const providerOptions = pipe(
      sync.data.provider,
      sortBy(
        (provider) => provider.id !== "opencode",
        (provider) => provider.name,
      ),
      flatMap((provider) =>
        pipe(
          provider.models,
          entries(),
          filter(([_, info]) => info.status !== "deprecated"),
          filter(([_, info]) => (props.providerID ? info.providerID === props.providerID : true)),
          map(([model, info]) => ({
            value: { providerID: provider.id, modelID: model },
            title: info.name ?? model,
            releaseDate: info.release_date,
            description: favorites.some((item) => item.providerID === provider.id && item.modelID === model)
              ? "(Favorite)"
              : undefined,
            category: connected() ? provider.name : undefined,
            disabled: provider.id === "opencode" && model.includes("-nano"),
            footer: info.cost?.input === 0 ? "Free" : undefined,
            gutter: favorites.some((item) => item.providerID === provider.id && item.modelID === model)
              ? () => <text fg={theme.warning}>★</text>
              : hidden.some((item) => item.providerID === provider.id && item.modelID === model)
                ? () => <box borderStyle="rounded" borderColor={theme.error} width={3} height={1} flexDirection="row" alignItems="center" justifyContent="center"><text fg={theme.error}> </text></box>
                : undefined,
            rowActions: createHideToggle(provider.id, model),
            onSelect() {
              onSelect(provider.id, model)
            },
          })),
          filter((x) => {
            if (!showSections) return true
            if (recents.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            if (hidden.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            return true
          }),
          (options) => sortModelOptions(options, props.providerID !== undefined),
        ),
      ),
    )

    const freeOptions = connected()
      ? providerOptions.filter((x) => x.footer === "Free")
      : []

    const popularProviders = !connected()
      ? pipe(
          providers(),
          map((option) => ({
            ...option,
            category: "Popular providers",
          })),
          take(6),
        )
      : []

    const hiddenSearchOptions = hidden.map((item) => {
      const provider = sync.data.provider.find((x) => x.id === item.providerID)
      if (!provider) return null
      const model = provider.models[item.modelID]
      if (!model) return null
      return {
        key: item,
        value: { providerID: provider.id, modelID: model.id },
        title: model.name ?? item.modelID,
        description: provider.name,
        category: provider.name,
        disabled: provider.id === "opencode" && model.id.includes("-nano"),
        footer: model.cost?.input === 0 ? "Free" : undefined,
        gutter: () => <box borderStyle="rounded" borderColor={theme.error} width={3} height={1} flexDirection="row" alignItems="center" justifyContent="center"><text fg={theme.error}> </text></box>,
        rowActions: createHideToggle(item.providerID, item.modelID),
        onSelect() {
          onSelect(provider.id, model.id)
        },
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)

    let results: DialogSelectOption[] = []

    if (needle) {
      results = [
        ...fuzzysort.go(needle, providerOptions, { keys: ["title", "category"] }).map((x) => x.obj),
        ...fuzzysort.go(needle, hiddenSearchOptions, { keys: ["title", "category"] }).map((x) => x.obj),
        ...fuzzysort.go(needle, popularProviders, { keys: ["title"] }).map((x) => x.obj),
      ]
    } else {
      results = [...recentOptions, ...hiddenOptions, ...freeOptions, ...providerOptions.filter((x) => x.footer !== "Free"), ...popularProviders]
    }

    const t = tab()
    if (t === "favorite") return results.filter((r) => favorites.some((f) => f.providerID === (r.value as { providerID: string; modelID: string }).providerID && f.modelID === (r.value as { providerID: string; modelID: string }).modelID))
    if (t === "free") return results.filter((r) => (r as any).footer === "Free")
    if (t === "hidden") return results.filter((r) => hidden.some((h) => h.providerID === (r.value as { providerID: string; modelID: string }).providerID && h.modelID === (r.value as { providerID: string; modelID: string }).modelID))
    return results
  })

  const provider = createMemo(() =>
    props.providerID ? sync.data.provider.find((x) => x.id === props.providerID) : null,
  )

  const title = createMemo(() => {
    const value = provider()
    if (!value) return "Select model"
    return value.name
  })

  const filterButtons = createMemo(() => {
    if (!showExtra()) return []
    return [
      { label: "All", active: tab() === "all", onSelect: () => setTab("all") },
      { label: "Favorites", active: tab() === "favorite", onSelect: () => setTab("favorite") },
      { label: "Free", active: tab() === "free", onSelect: () => setTab("free") },
      { label: "Hidden", active: tab() === "hidden", onSelect: () => setTab("hidden") },
    ]
  })

  function onSelect(providerID: string, modelID: string) {
    local.model.set({ providerID, modelID }, { recent: true })
    const list = local.model.variant.list()
    const cur = local.model.variant.selected()
    if (cur === "default" || (cur && list.includes(cur))) {
      dialog.clear()
      return
    }
    if (list.length > 0) {
      dialog.replace(() => <DialogVariant />)
      return
    }
    dialog.clear()
  }

  return (
    <DialogSelect<ReturnType<typeof options>[number]["value"]>
      options={options()}
      filterButtons={filterButtons()}
      actions={[
        {
          command: "model.dialog.provider",
          title: connected() ? "Connect provider" : "View all providers",
          onTrigger() {
            dialog.replace(() => <DialogProvider />)
          },
        },
        {
          command: "model.dialog.favorite",
          title: "★",
          hidden: !connected(),
          type: "toggle",
          checked: (option) => {
            if (!option) return false
            const val = option.value as { providerID: string; modelID: string }
            return local.model.favorite().some((f) => f.providerID === val.providerID && f.modelID === val.modelID)
          },
          onTrigger: (option) => {
            local.model.toggleFavorite(option.value as { providerID: string; modelID: string })
          },
        },
        {
          command: "model.dialog.hide",
          title: "Hide",
          hidden: !connected(),
          type: "toggle",
          checked: (option) => {
            if (!option) return false
            const val = option.value as { providerID: string; modelID: string }
            return local.model.hidden().some((h) => h.providerID === val.providerID && h.modelID === val.modelID)
          },
          onTrigger: (option) => {
            local.model.toggleHidden(option.value as { providerID: string; modelID: string })
          },
        },
      ]}
      onFilter={setQuery}
      flat={true}
      skipFilter={true}
      title={title()}
      current={local.model.current()}
    />
  )
}

export function sortModelOptions<T extends { footer?: string; releaseDate: string; title: string }>(
  options: T[],
  newestFirst: boolean,
) {
  if (newestFirst) return sortBy(options, [(option) => option.releaseDate, "desc"], (option) => option.title)
  return sortBy(
    options,
    (option) => option.footer !== "Free",
    (option) => option.title,
  )
}
