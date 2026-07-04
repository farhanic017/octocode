import path from "path"
import { describe, expect } from "bun:test"
import { Effect, Layer, Schema } from "effect"
import { Config } from "@octocode-ai/core/config"
import { ConfigSkillPlugin } from "@octocode-ai/core/config/plugin/skill"
import { Global } from "@octocode-ai/core/global"
import { Location } from "@octocode-ai/core/location"
import { AbsolutePath } from "@octocode-ai/core/schema"
import { SkillV2 } from "@octocode-ai/core/skill"
import { location } from "../fixture/location"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.empty)
const decode = Schema.decodeUnknownSync(Config.Info)

describe("ConfigSkillPlugin.Plugin", () => {
  it.effect("registers configured skill directories and URLs", () =>
    Effect.gen(function* () {
      const directory = AbsolutePath.make("/repo/packages/app")
      const sources: SkillV2.Source[] = []
      const transform = Effect.fnUntraced(function* () {
        return Effect.fnUntraced(function* (update: (editor: SkillV2.Editor) => void) {
          update({
            source: (source) => sources.push(source),
            list: () => sources,
          })
        })
      })

      yield* ConfigSkillPlugin.Plugin.effect.pipe(
        Effect.provideService(
          Config.Service,
          Config.Service.of({
            entries: () =>
              Effect.succeed([
                new Config.Directory({ type: "directory", path: AbsolutePath.make("/repo/.octocode") }),
                new Config.Document({
                  type: "document",
                  info: decode({
                    skills: ["./skills", "~/shared-skills", "/opt/skills", "https://example.test/skills/"],
                  }),
                }),
              ]),
          }),
        ),
        Effect.provideService(Global.Service, Global.Service.of(Global.make({ home: "/home/test" }))),
        Effect.provideService(Location.Service, Location.Service.of(location({ directory }))),
        Effect.provideService(
          SkillV2.Service,
          SkillV2.Service.of({
            transform,
            sources: () => Effect.succeed(sources),
            list: () => Effect.succeed([]),
          }),
        ),
      )

      expect(sources).toEqual([
        new SkillV2.DirectorySource({
          type: "directory",
          path: AbsolutePath.make(path.join("/repo/.octocode", "skill")),
        }),
        new SkillV2.DirectorySource({
          type: "directory",
          path: AbsolutePath.make(path.join("/repo/.octocode", "skills")),
        }),
        new SkillV2.DirectorySource({ type: "directory", path: AbsolutePath.make(path.join(directory, "skills")) }),
        new SkillV2.DirectorySource({
          type: "directory",
          path: AbsolutePath.make(path.join("/home/test", "shared-skills")),
        }),
        new SkillV2.DirectorySource({ type: "directory", path: AbsolutePath.make("/opt/skills") }),
        new SkillV2.UrlSource({ type: "url", url: "https://example.test/skills/" }),
      ])
    }),
  )
})


