import { createMemo, createSignal } from "solid-js"
import { useLocal } from "@/cli/cmd/tui/context/local"
import { useSync } from "@/cli/cmd/tui/context/sync"
import { map, pipe, flatMap, entries, filter, sortBy, take } from "remeda"
import { DialogSelect } from "@/cli/cmd/tui/ui/dialog-select"
import { useDialog, type DialogContext } from "@/cli/cmd/tui/ui/dialog"
import { createDialogProviderOptions } from "./dialog-provider"
import { DialogMimoLogin } from "./dialog-mimo-login"
import { DialogVariant } from "./dialog-variant"
import { useKeybind } from "../context/keybind"
import { useSDK } from "../context/sdk"
import { useToast, type ToastContext } from "../ui/toast"
import { DialogPrompt } from "../ui/dialog-prompt"
import { useLanguage } from "@/cli/cmd/tui/context/language"
import * as Model from "../util/model"
import { PROVIDER_PRIORITY } from "@/util/provider-priority"
import * as fuzzysort from "fuzzysort"

const ADD_MODEL_SENTINEL = "__add_model__"

export function useConnected() {
  const sync = useSync()
  return createMemo(() =>
    sync.data.provider.some((x) => x.id !== "opencode" || Object.values(x.models).some((y) => y.cost?.input !== 0)),
  )
}

export function DialogModel(props: { providerID?: string }) {
  const local = useLocal()
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const keybind = useKeybind()
  const [query, setQuery] = createSignal("")
  const [tab, setTab] = createSignal<"all" | "favorite" | "free" | "hidden">("all")

  const connected = useConnected()
  const providers = createDialogProviderOptions()
  const t = useLanguage().t
  const modelName = (providerID: string, modelID: string) =>
    modelID === "mimo-auto" ? t("tui.model.mimo_auto.name") : Model.name(sync.data.provider, providerID, modelID)

  const showExtra = createMemo(() => connected() && !props.providerID)

  function createFavoriteToggle(providerID: string, modelID: string) {
    return [{
      checked: () => local.model.favorite().some((f) => f.providerID === providerID && f.modelID === modelID),
      onTrigger: () => local.model.toggleFavorite({ providerID, modelID }),
      icon: "★",
    }]
  }

  function createHideToggle(providerID: string, modelID: string) {
    return [{
      checked: () => local.model.hidden().some((h) => h.providerID === providerID && h.modelID === modelID),
      onTrigger: () => local.model.toggleHidden({ providerID, modelID }),
    }]
  }

  const options = createMemo(() => {
    const needle = query().trim()
    const showSections = showExtra() && needle.length === 0
    const favorites = connected() ? local.model.favorite() : []
    const recents = local.model.recent()
    const hidden = connected() ? local.model.hidden() : []
    const hiddenSet = new Set(hidden.map((h) => `${h.providerID}/${h.modelID}`))

    function toOptions(items: typeof favorites, category: string) {
      if (!showSections) return []
      return items.flatMap((item) => {
        const provider = sync.data.provider.find((x) => x.id === item.providerID)
        if (!provider) return []
        const model = provider.models[item.modelID]
        if (!model) return []
        return [
          {
            value: { providerID: provider.id, modelID: model.id },
            title: modelName(provider.id, model.id),
            description: provider.name,
            category,
            disabled: provider.id === "opencode" && model.id.includes("-nano"),
            footer: model.cost?.input === 0 ? "Free" : undefined,
            rowActions: [...createFavoriteToggle(provider.id, model.id), ...createHideToggle(provider.id, model.id)],
            onSelect() {
              onSelect(provider.id, model.id)
            },
          },
        ]
      })
    }

    const favoriteOptions = toOptions(favorites, "Favorites")
    const recentOptions = toOptions(
      recents.filter((item) => !hiddenSet.has(`${item.providerID}/${item.modelID}`)),
      "Recent",
    )

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
            description: undefined as string | undefined,
            category: connected() ? provider.name : undefined,
            disabled: provider.id === "opencode" && model.includes("-nano"),
            footer: info.cost?.input === 0 ? "Free" : undefined,
            rowActions: [...createFavoriteToggle(provider.id, model), ...createHideToggle(provider.id, model)],
            onSelect() {
              onSelect(provider.id, model)
            },
          })),
          filter((x) => {
            // Only filter out hidden models - recents/favorites still show under provider
            if (hiddenSet.has(`${x.value.providerID}/${x.value.modelID}`)) return false
            return true
          }),
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

    // Apply tab filter
    const t = tab()
    if (t === "hidden") {
      const hiddenResults: typeof providerOptions = []
      for (const provider of sync.data.provider) {
        for (const [modelID, info] of Object.entries(provider.models)) {
          if (hiddenSet.has(`${provider.id}/${modelID}`)) {
            hiddenResults.push({
              value: { providerID: provider.id, modelID },
              title: info.name ?? modelID,
              description: provider.name,
              category: provider.name,
              disabled: false,
              footer: info.cost?.input === 0 ? "Free" : undefined,
              rowActions: [...createFavoriteToggle(provider.id, modelID), ...createHideToggle(provider.id, modelID)],
              onSelect() {
                onSelect(provider.id, modelID)
              },
            })
          }
        }
      }
      return hiddenResults
    }
    if (t === "favorite") {
      return favoriteOptions
    }
    if (t === "free") {
      return freeOptions
    }
    // For "all" tab: recent + provider options (favorites have their own section)
    return [...recentOptions, ...providerOptions, ...popularProviders]
  })

  const provider = createMemo(() =>
    props.providerID ? sync.data.provider.find((x) => x.id === props.providerID) : null,
  )

  const title = createMemo(() => {
    const value = provider()
    if (!value) return "Select model"
    return value.name
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

  const filterButtons = createMemo(() => {
    if (!connected()) return []
    return [
      { label: "All", active: tab() === "all", onSelect: () => setTab("all") },
      { label: "Favorites", active: tab() === "favorite", onSelect: () => setTab("favorite") },
      { label: "Free", active: tab() === "free", onSelect: () => setTab("free") },
      { label: "Hidden", active: tab() === "hidden", onSelect: () => setTab("hidden") },
    ]
  })

  return (
    <DialogSelect<ReturnType<typeof options>[number]["value"]>
      options={options()}
      filterButtons={filterButtons()}
      keybind={[
        {
          keybind: keybind.all.model_provider_list?.[0],
          title: "Connect provider",
          onTrigger() {
            dialog.replace(() => <DialogMimoLogin />)
          },
        },
        {
          keybind: keybind.all.model_favorite_toggle?.[0],
          title: "Favorite",
          disabled: !connected(),
          onTrigger: (option) => {
            const v = option.value as { providerID: string; modelID: string }
            if (v.modelID === ADD_MODEL_SENTINEL) return
            local.model.toggleFavorite(v)
          },
        },
      ]}
      onFilter={setQuery}
      flat={true}
      title={title()}
      current={local.model.current()}
    />
  )
}

async function runAddModelWizard(opts: {
  dialog: DialogContext
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
  toast: ToastContext
  providerID: string
}) {
  const { dialog, sdk, sync, toast, providerID } = opts

  function step(n: number, total: number, title: string, placeholder?: string, value?: string) {
    return DialogPrompt.show(dialog, `${title} (${n}/${total})`, { placeholder, value })
  }

  const modelIDRaw = await step(1, 2, "Model id", "gateway model id")
  if (modelIDRaw === null) return
  const modelID = modelIDRaw.trim()
  if (!modelID) return

  const modelNameRaw = await step(2, 2, "Display name", "shown in model picker", modelID)
  if (modelNameRaw === null) return
  const modelName = modelNameRaw.trim() || modelID

  const patch = {
    provider: {
      [providerID]: {
        models: {
          [modelID]: {
            name: modelName,
          },
        },
      },
    },
  }

  const updateRes = await sdk.client.global.config.update({ config: patch as any })
  if (updateRes.error) {
    toast.show({ variant: "error", message: JSON.stringify(updateRes.error) })
    return
  }

  await sdk.client.instance.dispose()
  await sync.bootstrap()
  dialog.replace(() => <DialogModel providerID={providerID} />)
}
