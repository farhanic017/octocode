CREATE TABLE IF NOT EXISTS `episodic_memory` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `timestamp` integer NOT NULL,
  `session_id` text NOT NULL DEFAULT '',
  `task_type` text NOT NULL,
  `outcome` text NOT NULL,
  `title` text NOT NULL,
  `summary` text NOT NULL,
  `details` text NOT NULL DEFAULT '',
  `tags` text NOT NULL DEFAULT '',
  `duration_ms` integer NOT NULL DEFAULT 0,
  `files_changed` text NOT NULL DEFAULT '',
  `error_message` text NOT NULL DEFAULT '',
  `retry_count` integer NOT NULL DEFAULT 0,
  `confidence` real NOT NULL DEFAULT 1.0,
  `scope` text NOT NULL DEFAULT 'project',
  `scope_id` text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS `episodic_timestamp_idx` ON `episodic_memory` (`timestamp`);
CREATE INDEX IF NOT EXISTS `episodic_outcome_idx` ON `episodic_memory` (`outcome`);
CREATE INDEX IF NOT EXISTS `episodic_task_type_idx` ON `episodic_memory` (`task_type`);
CREATE INDEX IF NOT EXISTS `episodic_scope_idx` ON `episodic_memory` (`scope`, `scope_id`);
CREATE INDEX IF NOT EXISTS `episodic_session_idx` ON `episodic_memory` (`session_id`);

CREATE TABLE IF NOT EXISTS `procedural_memory` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `skill_name` text NOT NULL,
  `pattern` text NOT NULL,
  `description` text NOT NULL,
  `steps` text NOT NULL DEFAULT '',
  `file_template` text NOT NULL DEFAULT '',
  `tags` text NOT NULL DEFAULT '',
  `use_count` integer NOT NULL DEFAULT 1,
  `success_rate` real NOT NULL DEFAULT 1.0,
  `avg_duration_ms` integer NOT NULL DEFAULT 0,
  `last_used_at` integer NOT NULL DEFAULT 0,
  `scope` text NOT NULL DEFAULT 'project',
  `scope_id` text NOT NULL DEFAULT '',
  `source` text NOT NULL DEFAULT 'auto',
  `confidence` real NOT NULL DEFAULT 0.5,
  `status` text NOT NULL DEFAULT 'draft'
);

CREATE INDEX IF NOT EXISTS `procedural_skill_idx` ON `procedural_memory` (`skill_name`);
CREATE INDEX IF NOT EXISTS `procedural_pattern_idx` ON `procedural_memory` (`pattern`);
CREATE INDEX IF NOT EXISTS `procedural_scope_idx` ON `procedural_memory` (`scope`, `scope_id`);
CREATE INDEX IF NOT EXISTS `procedural_status_idx` ON `procedural_memory` (`status`);
CREATE INDEX IF NOT EXISTS `procedural_use_count_idx` ON `procedural_memory` (`use_count`);

CREATE TABLE IF NOT EXISTS `cron_schedule` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `name` text NOT NULL,
  `cron_expr` text NOT NULL,
  `command` text NOT NULL,
  `args` text NOT NULL DEFAULT '{}',
  `enabled` integer NOT NULL DEFAULT 1,
  `last_run_at` integer NOT NULL DEFAULT 0,
  `next_run_at` integer NOT NULL DEFAULT 0,
  `last_result` text NOT NULL DEFAULT '',
  `run_count` integer NOT NULL DEFAULT 0,
  `session_id` text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS `cron_next_run_idx` ON `cron_schedule` (`next_run_at`);
CREATE INDEX IF NOT EXISTS `cron_enabled_idx` ON `cron_schedule` (`enabled`);

CREATE TABLE IF NOT EXISTS `messaging_config` (
  `platform` text PRIMARY KEY NOT NULL,
  `config` text NOT NULL,
  `enabled` integer NOT NULL DEFAULT 1,
  `updated_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `messaging_enabled_idx` ON `messaging_config` (`enabled`);

CREATE TABLE IF NOT EXISTS `messaging_users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `platform` text NOT NULL,
  `platform_user_id` text NOT NULL,
  `display_name` text NOT NULL DEFAULT '',
  `permission` text NOT NULL DEFAULT 'read-only',
  `added_at` integer NOT NULL,
  `added_by` text NOT NULL DEFAULT '',
  `notes` text NOT NULL DEFAULT '',
  `active` integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS `messaging_users_platform_idx` ON `messaging_users` (`platform`, `platform_user_id`);
CREATE INDEX IF NOT EXISTS `messaging_users_permission_idx` ON `messaging_users` (`permission`);
