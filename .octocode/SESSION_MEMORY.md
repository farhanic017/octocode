# Session Memory: OctoCode Model Hiding Features

**Date:** 2026-06-08/09
**Project:** `C:\Users\Farhan\Desktop\octo code` (OctoCode - open source AI coding agent)
**Goal:** Add model hiding, favorites, free categories, and auto-switching to the OctoCode TUI model selector

## Project Overview

OctoCode is a large TypeScript/Bun monorepo for an open-source AI coding agent. Key packages:
- `packages/core` — Core logic (model, provider, catalog, config schemas using Effect-TS)
- `packages/llm` — LLM integration
- `packages/tui` — Terminal UI (SolidJS + OpenTUI)
- `packages/octocode` — CLI entry point and interactive run mode
- `packages/web` — Web UI (Astro/SolidJS)
- `packages/app` — Console app

The TUI uses SolidJS with OpenTUI for terminal rendering. Model selection happens via `DialogModel` component.

## What Was Already in Place (before our changes)

OctoCode already had:
- **Favorites** system: `local.model.favorite()`, `toggleFavorite()`, `cycleFavorite()` with persistence in `model.json`
- **Recent models**: `local.model.recent()` with automatic tracking
- **Model dialog** (`dialog-model.tsx`): Shows Favorites and Recent sections when connected
- **Footer model selector** (`footer.command.tsx`): Simple searchable list in interactive CLI mode
- **"Free" label**: On zero-cost OctoCode models (footer text, not a category)

## What We Added

### 1. Hidden Models System (`local.tsx`)

**File:** `packages/tui/src/context/local.tsx`

Changes to the model store:
- Added `hidden` array to the store type definition (alongside `recent`, `favorite`, `variant`)
- Added `hidden: []` to initial state
- Added `hidden` to `save()` function (persists to `model.json`)
- Added `hidden` loading from `model.json` on startup

New methods:
- `hidden()` — accessor returning the hidden models array
- `toggleHidden(model)` — adds/removes a model from the hidden list with `isModelValid` check
- `cycleHidden(direction)` — cycles through hidden models with toast feedback when empty

### 2. Dialog Model Updates (`dialog-model.tsx`)

**File:** `packages/tui/src/component/dialog-model.tsx`

New sections in the model selector dialog:
- **"Hidden" category** — Shows hidden models (excluding those already in Favorites or Recent)
- **"Free" category** — Shows zero-cost OctoCode models in their own section
- **Hidden model filter** — Hidden models excluded from the main provider list (avoids duplication)
- **Free model filter** — Free models extracted from provider list into their own section
- **"Hide" action button** — Alongside "Favorite" action in the dialog footer

Search improvements:
- Hidden models are searchable via fuzzy search even though excluded from the main list
- Users can find hidden models to select or unhide them

Return order: Favorites → Recent → Hidden → Free → Provider models (non-free) → Popular providers

### 3. Bug Fixes Applied

1. **`cycleHidden` empty state** — Added toast notification "No hidden models" when trying to cycle with no hidden models (matching `cycleFavorite` behavior)
2. **`toggleHidden` validation** — Added `isModelValid` check before toggling (matching `toggleFavorite` consistency)
3. **Hidden model search** — Added `hiddenSearchOptions` so hidden models appear in fuzzy search results
4. **TypeScript type fix** — Replaced `.filter(Boolean)` with proper type guard `(x): x is NonNullable<typeof x> => x !== null`

## Files Modified

1. `packages/tui/src/context/local.tsx` — Store, persistence, methods
2. `packages/tui/src/component/dialog-model.tsx` — UI sections, actions, search

## Typecheck Status

`packages/tui` — **PASSES** (`bun run --bun tsc --noEmit` from packages/tui)

## What Was NOT Modified (and why)

- **`packages/octocode/src/cli/cmd/run/footer.command.tsx`** — The footer `RunModelSelectBody` is in a separate package that receives providers directly from the SDK, not from the TUI's local context. Adding hidden model filtering here would require passing hidden state through props or reading `model.json` separately. Left for a future enhancement.

## Data Persistence

Model preferences (including hidden) are stored in `{tui-state-dir}/model.json`:
```json
{
  "recent": [...],
  "favorite": [...],
  "hidden": [...],
  "variant": {...}
}
```

## Key Architecture Notes

- The TUI uses Effect-TS for core logic and SolidJS for UI
- `local.tsx` is a context provider using `createStore` from SolidJS
- Dialog components use `DialogSelect` with options, actions, and fuzzy search via `fuzzysort`
- Model state is scoped per-agent (stored as `model[agentName]` in the store)
- The `useLocal()` hook provides access to `model`, `agent`, `session`, `mcp` APIs

## Future Work

- Add hidden model support to the footer `RunModelSelectBody` (requires prop threading)
- Consider auto-switching when hiding the currently active model
- Add keyboard shortcuts for `cycleHidden`
- Consider a "show hidden" toggle instead of always showing hidden in the dialog
