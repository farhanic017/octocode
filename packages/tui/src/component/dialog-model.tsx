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
  const [hoveredProvider, setHoveredProvider] = createSignal(false)

  const connected = useConnected()
  const { theme } = useTheme()
  const providers = createDialogProviderOptions()

  const showExtra = createMemo(() => connected() && !props.providerID)

  function createHideToggle(providerID: string, modelID: string): { checked: () => boolean; onTrigger: () => void; icon?: string; display?: boolean }[] {
    return [{
      checked: () => local.model.hidden().some((h) => h.providerID === providerID && h.modelID === modelID),
      onTrigger: () => {
        local.model.toggleHidden({ providerID, modelID })
      },
    }]
  }

  function createFavoriteToggle(providerID: string, modelID: string): { checked: () => boolean; onTrigger: () => void; icon?: string; display?: boolean }[] {
    return [{
      checked: () => local.model.favorite().some((f) => f.providerID === providerID && f.modelID === modelID),
      onTrigger: () => {
        local.model.toggleFavorite({ providerID, modelID })
      },
      icon: "★",
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
            disabled: provider.id === "octo" && model.id.includes("-nano"),
            footer: model.cost?.input === 0 ? "[Free]" : undefined,
            footerAfterDescription: category === "Favorites" || category === "Recent",
            gutter: undefined,
            rowActions: [...createFavoriteToggle(provider.id, model.id), ...createHideToggle(provider.id, model.id)],
            onSelect: () => {
              onSelect(provider.id, model.id)
            },
          },
        ]
      })
    }

    const favoriteOptions = toOptions(favorites, "Favorites")
    const recentOptions = toOptions(
      recents.filter((item) => !hidden.some((h) => h.providerID === item.providerID && h.modelID === item.modelID)),
      "Recent",
    )

    const hiddenOptions = toOptions(hidden, "Hidden")

    const providerOptions = pipe(
      sync.data.provider,
      sortBy((provider) => provider.name.toLowerCase()),
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
            description: undefined,
            category: connected() ? provider.name : undefined,
            disabled: provider.id === "octo" && model.includes("-nano"),
            footer: info.cost?.input === 0 ? "[Free]" : undefined,
            gutter: hidden.some((item) => item.providerID === provider.id && item.modelID === model)
              ? () => <box borderStyle="rounded" borderColor={theme.error} width={3} height={1} flexDirection="row" alignItems="center" justifyContent="center"><text fg={theme.error}> </text></box>
              : undefined,
            rowActions: [...createFavoriteToggle(provider.id, model), ...createHideToggle(provider.id, model)],
            onSelect() {
              onSelect(provider.id, model)
            },
          })),
          filter((x) => {
            if (hidden.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            if (showSections && recents.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            if (showSections && favorites.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            return true
          }),
          (options) => sortModelOptions(options, props.providerID !== undefined),
        ),
      ),
    )

    const freeOptions = connected()
      ? providerOptions.filter((x) => x.footer === "[Free]")
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
        disabled: provider.id === "octo" && model.id.includes("-nano"),
        footer: model.cost?.input === 0 ? "Free" : undefined,
        gutter: () => <box borderStyle="rounded" borderColor={theme.error} width={3} height={1} flexDirection="row" alignItems="center" justifyContent="center"><text fg={theme.error}> </text></box>,
        rowActions: [...createFavoriteToggle(item.providerID, item.modelID), ...createHideToggle(item.providerID, item.modelID)],
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
      results = [...recentOptions, ...freeOptions, ...providerOptions.filter((x) => x.footer !== "[Free]"), ...popularProviders]
    }

    const t = tab()
    if (t === "favorite") return results.filter((r) => favorites.some((f) => f.providerID === (r.value as { providerID: string; modelID: string }).providerID && f.modelID === (r.value as { providerID: string; modelID: string }).modelID))
    if (t === "free") return results.filter((r) => (r as any).footer === "[Free]")
    if (t === "hidden") return hiddenOptions
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
      actions={[]}
      onFilter={setQuery}
      flat={true}
      skipFilter={true}
      title={title()}
      current={local.model.current()}
      headerRight={
        <text
          fg={hoveredProvider() ? "#a45c75" : "#8f8586"}
          onMouseOver={() => setHoveredProvider(true)}
          onMouseOut={() => setHoveredProvider(false)}
          onMouseUp={() => dialog.replace(() => <DialogProvider />)}
        >
          + provider
        </text>
      }
    />
  )
}

export function sortModelOptions<T extends { footer?: string; releaseDate: string; title: string }>(
  options: T[],
  newestFirst: boolean,
) {
  if (newestFirst) {
    return sortBy(options, (option) => -new Date(option.releaseDate).getTime())
  }
  return sortBy(options, (option) => (option.footer ? 0 : 1), (option) => option.title.toLowerCase())
}
