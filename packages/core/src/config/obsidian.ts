export * as ConfigObsidian from "./obsidian"

import { Schema } from "effect"

export class Info extends Schema.Class<Info>("ConfigV2.Obsidian")({
  vault_path: Schema.String.pipe(Schema.optional).annotate({
    description: "Absolute path to your Obsidian vault directory",
  }),
  enabled: Schema.Boolean.pipe(Schema.optional).annotate({
    description: "Enable Obsidian vault integration for cross-session context",
  }),
  sync_sessions: Schema.Boolean.pipe(Schema.optional).annotate({
    description: "Automatically sync session summaries to the vault",
  }),
  read_notes: Schema.Boolean.pipe(Schema.optional).annotate({
    description: "Read relevant vault notes as agent context at session start",
  }),
  note_folder: Schema.String.pipe(Schema.optional).annotate({
    description: "Subfolder within the vault for OctoCode notes (default: OctoCode)",
  }),
  max_context_notes: Schema.Int.pipe(Schema.optional).annotate({
    description: "Maximum number of vault notes to inject as context (default: 20)",
  }),
}) {}
