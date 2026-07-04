import { Config, ConfigProvider, Context, Effect, Layer, Option } from "effect"
import { ConfigService } from "@/effect/config-service"

const bool = (name: string) => Config.boolean(name).pipe(Config.withDefault(false))
const positiveInteger = (name: string) =>
  Config.number(name).pipe(
    Config.map((value) => (Number.isInteger(value) && value > 0 ? value : undefined)),
    Config.orElse(() => Config.succeed(undefined)),
  )
const experimental = bool("OCTOCODE_EXPERIMENTAL")
const enabledByExperimental = (name: string) =>
  Config.all({ experimental, enabled: Config.boolean(name).pipe(Config.option) }).pipe(
    Config.map((flags) => Option.getOrElse(flags.enabled, () => flags.experimental)),
  )

export class Service extends ConfigService.Service<Service>()("@octocode/RuntimeFlags", {
  autoShare: bool("OCTOCODE_AUTO_SHARE"),
  pure: bool("OCTOCODE_PURE"),
  disableDefaultPlugins: bool("OCTOCODE_DISABLE_DEFAULT_PLUGINS"),
  disableEmbeddedWebUi: bool("OCTOCODE_DISABLE_EMBEDDED_WEB_UI"),
  disableExternalSkills: bool("OCTOCODE_DISABLE_EXTERNAL_SKILLS"),
  disableLspDownload: bool("OCTOCODE_DISABLE_LSP_DOWNLOAD"),
  disableClaudeCodePrompt: Config.all({
    broad: bool("OCTOCODE_DISABLE_CLAUDE_CODE"),
    direct: bool("OCTOCODE_DISABLE_CLAUDE_CODE_PROMPT"),
  }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  disableClaudeCodeSkills: Config.all({
    broad: bool("OCTOCODE_DISABLE_CLAUDE_CODE"),
    direct: bool("OCTOCODE_DISABLE_CLAUDE_CODE_SKILLS"),
  }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  enableExa: Config.all({
    experimental,
    enabled: bool("OCTOCODE_ENABLE_EXA"),
    legacy: bool("OCTOCODE_EXPERIMENTAL_EXA"),
  }).pipe(Config.map((flags) => flags.experimental || flags.enabled || flags.legacy)),
  enableParallel: Config.all({
    enabled: bool("OCTOCODE_ENABLE_PARALLEL"),
    legacy: bool("OCTOCODE_EXPERIMENTAL_PARALLEL"),
  }).pipe(Config.map((flags) => flags.enabled || flags.legacy)),
  enableExperimentalModels: bool("OCTOCODE_ENABLE_EXPERIMENTAL_MODELS"),
  enableQuestionTool: bool("OCTOCODE_ENABLE_QUESTION_TOOL"),
  experimentalReferences: enabledByExperimental("OCTOCODE_EXPERIMENTAL_REFERENCES"),
  experimentalBackgroundSubagents: enabledByExperimental("OCTOCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS"),
  experimentalLspTy: bool("OCTOCODE_EXPERIMENTAL_LSP_TY"),
  experimentalLspTool: enabledByExperimental("OCTOCODE_EXPERIMENTAL_LSP_TOOL"),
  experimentalOxfmt: enabledByExperimental("OCTOCODE_EXPERIMENTAL_OXFMT"),
  experimentalPlanMode: enabledByExperimental("OCTOCODE_EXPERIMENTAL_PLAN_MODE"),
  experimentalEventSystem: enabledByExperimental("OCTOCODE_EXPERIMENTAL_EVENT_SYSTEM"),
  experimentalWorkspaces: enabledByExperimental("OCTOCODE_EXPERIMENTAL_WORKSPACES"),
  experimentalIconDiscovery: enabledByExperimental("OCTOCODE_EXPERIMENTAL_ICON_DISCOVERY"),
  outputTokenMax: positiveInteger("OCTOCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX"),
  bashDefaultTimeoutMs: positiveInteger("OCTOCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"),
  experimentalNativeLlm: bool("OCTOCODE_EXPERIMENTAL_NATIVE_LLM"),
  experimentalWebSockets: bool("OCTOCODE_EXPERIMENTAL_WEBSOCKETS"),
  client: Config.string("OCTOCODE_CLIENT").pipe(Config.withDefault("cli")),
}) {}

export type Info = Context.Service.Shape<typeof Service>

const emptyConfigLayer = Service.defaultLayer.pipe(
  Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
  Layer.orDie,
)

export const layer = (overrides: Partial<Info> = {}) =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const flags = yield* Service
      return Service.of({ ...flags, ...overrides })
    }),
  ).pipe(Layer.provide(emptyConfigLayer))

export const defaultLayer = Service.defaultLayer.pipe(Layer.orDie)

export * as RuntimeFlags from "./runtime-flags"
