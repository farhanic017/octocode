import { Context, Effect, Layer } from "effect"
import { PersonalityService } from "./traits"
import { defaultLayer as PersonalityDefaultLayer } from "./traits"
import { Database } from "../storage"

export interface GrowthInterface {
  readonly adaptToUser: (userId: string) => Effect.Effect<{ formality: number; technicalDepth: number }>
  readonly recordInteractionStyle: (userId: string, style: string) => Effect.Effect<void>
}

export class GrowthService extends Context.Service<GrowthService, GrowthInterface>()("@octocode/Growth") {}

function createGrowthService(): GrowthInterface {
  return {
    adaptToUser: (_userId: string) =>
      Effect.gen(function* () {
        let formality = 50
        let technicalDepth = 50

        try {
          const rows = yield* Database.use((db) =>
            (db as any).all("SELECT communication_style, role FROM memory_fts WHERE scope = ? AND type = 'user' LIMIT 1", [_userId]),
          ) as any
          if (rows && rows.length > 0) {
            if (rows[0].communication_style === "casual") formality = 30
            else if (rows[0].communication_style === "formal") formality = 80
            if (rows[0].role === "developer" || rows[0].role === "engineer") technicalDepth = 75
            else if (rows[0].role === "designer") technicalDepth = 40
          }
        } catch {}

        return { formality, technicalDepth }
      }) as any,

    recordInteractionStyle: (_userId: string, _style: string) =>
      Effect.sync(() => {}),
  }
}

export const layer = Layer.effect(GrowthService, Effect.succeed(createGrowthService()) as any)
export const defaultLayer = layer.pipe(
  Layer.provide(PersonalityDefaultLayer),
)
