import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

export const MessagingUsersTable = sqliteTable(
  "messaging_users",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    platform: text().notNull(),
    platform_user_id: text().notNull(),
    display_name: text().notNull().default(""),
    permission: text().notNull().default("read-only"),
    added_at: integer().notNull(),
    added_by: text().notNull().default(""),
    notes: text().notNull().default(""),
    active: integer().notNull().default(1),
  },
  (table) => [
    index("messaging_users_platform_idx").on(table.platform, table.platform_user_id),
    index("messaging_users_permission_idx").on(table.permission),
  ],
)

export type MessagingUserRow = typeof MessagingUsersTable.$inferSelect

export type Permission = "full" | "read-only" | "blocked"

export function isAllowed(permission: Permission): boolean {
  return permission !== "blocked"
}

export function canExecute(permission: Permission): boolean {
  return permission === "full"
}
