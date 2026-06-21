import type { Config } from "@/config/config"
import { ConfigV1 } from "@octocode-ai/core/v1/config/config"
import { SessionV1 } from "@octocode-ai/core/v1/session"
import type { Provider } from "@/provider/provider"
import { ProviderTransform } from "@/provider/transform"
import type { MessageV2 } from "./message-v2"

// Default compaction buffer - used when model doesn't specify output limits
const DEFAULT_COMPACTION_BUFFER = 20_000

export function usable(input: { cfg: ConfigV1.Info; model: Provider.Model; outputTokenMax?: number }) {
  const context = input.model.limit.context
  if (context === 0) return 0

  const maxOutput = ProviderTransform.maxOutputTokens(input.model, input.outputTokenMax)
  
  // Use config reserved if set, otherwise reserve space for output tokens
  // This ensures compaction triggers before the model runs out of room for output
  const reserved =
    input.cfg.compaction?.reserved ??
    Math.max(20_000, Math.min(100_000, Math.floor(maxOutput * 0.1)))
  
  // When limit.input is set, subtract reserved from input limit (not context)
  // This ensures models with explicit input limits still reserve output headroom
  return input.model.limit.input
    ? Math.max(0, input.model.limit.input - reserved)
    : Math.max(0, context - maxOutput)
}

export function isOverflow(input: {
  cfg: ConfigV1.Info
  tokens: SessionV1.Assistant["tokens"]
  model: Provider.Model
  outputTokenMax?: number
}) {
  if (input.cfg.compaction?.auto === false) return false
  if (input.model.limit.context === 0) return false

  const count =
    input.tokens.total || input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write
  return count >= usable(input)
}
