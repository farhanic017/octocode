/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill"

import path from "path"
import { fileURLToPath } from "url"
import { Effect } from "effect"
import { PluginV2 } from "../plugin"
import { AbsolutePath } from "../schema"
import { SkillV2 } from "../skill"
import customizeOctocodeContent from "./skill/customize-octocode.md" with { type: "text" }

export const CustomizeOctocodeContent = customizeOctocodeContent

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const Plugin = PluginV2.define({
  id: PluginV2.ID.make("skill"),
  effect: Effect.gen(function* () {
    const skill = yield* SkillV2.Service
    const transform = yield* skill.transform()

    yield* transform((editor) => {
      editor.source(
        new SkillV2.EmbeddedSource({
          type: "embedded",
          skill: new SkillV2.Info({
            name: "customize-octocode",
            description:
              "Use ONLY when the user is editing or creating octocode's own configuration: octocode.json, octocode.jsonc, files under .octocode/, or files under ~/.config/octocode/. Also use when creating or fixing octocode agents, subagents, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring octocode itself.",
            location: AbsolutePath.make("/builtin/customize-octocode.md"),
            content: CustomizeOctocodeContent,
          }),
        }),
      )

      editor.source(
        new SkillV2.DirectorySource({
          type: "directory",
          path: AbsolutePath.make(path.join(__dirname, "skill", "watch")),
        }),
      )

      editor.source(
        new SkillV2.DirectorySource({
          type: "directory",
          path: AbsolutePath.make(path.join(__dirname, "skill", "scrape")),
        }),
      )

      editor.source(
        new SkillV2.DirectorySource({
          type: "directory",
          path: AbsolutePath.make(path.join(__dirname, "skill", "reach")),
        }),
      )

      editor.source(
        new SkillV2.DirectorySource({
          type: "directory",
          path: AbsolutePath.make(path.join(__dirname, "skill", "vision")),
        }),
      )
    })
  }),
})


