import { Effect, Layer, Schema } from "effect"
import { SystemContextRegistry } from "./registry"
import { ObsidianVault } from "../obsidian/vault"
import { SystemContext } from "./index"

const key = SystemContext.Key.make("core/obsidian-vault")

export const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    const registry = yield* SystemContextRegistry.Service
    const vault = yield* ObsidianVault.Service

    const source = (value: string) =>
      SystemContext.make({
        key,
        codec: Schema.toCodecJson(Schema.String),
        load: Effect.succeed(value),
        baseline: (context) =>
          context.length > 0
            ? [
                "The user maintains an Obsidian vault with project notes and session history.",
                "Use this context to understand prior work, decisions, and ongoing tasks.",
                "",
                context,
              ].join("\n")
            : "",
        update: (_previous, current) =>
          current.length > 0
            ? [
                "Updated Obsidian vault context:",
                "",
                current,
              ].join("\n")
            : "Obsidian vault context is now empty.",
        removed: () => "Previously loaded Obsidian vault context is no longer available.",
      })

    yield* registry.register({
      key,
      load: vault.getNoteContext().pipe(
        Effect.map((context) => (context.length === 0 ? SystemContext.empty : source(context))),
        Effect.catch(() => Effect.succeed(SystemContext.empty)),
        Effect.catchDefect(() => Effect.succeed(SystemContext.empty)),
      ),
    })
  }),
)

export * as ObsidianSystemContext from "./obsidian-context"
