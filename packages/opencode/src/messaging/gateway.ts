import { Context, Effect, Layer } from "effect"
import type { PlatformAdapter, Message } from "./types"
import { TelegramAdapter } from "./telegram"
import { DiscordAdapter } from "./discord"
import { EmailAdapter } from "./email"
import { WebhookAdapter } from "./webhook"
import { Database } from "../storage"
import { MessagingUsersTable, type Permission } from "./users.sql"
import { isCommand, parseCommand, handleCommand } from "./commands"
import { eq, and } from "drizzle-orm"

export interface GatewayInterface {
  readonly connect: (platform: string, config: Record<string, unknown>) => Effect.Effect<void>
  readonly disconnect: (platform: string) => Effect.Effect<void>
  readonly send: (platform: string, chatId: string, text: string) => Effect.Effect<string>
  readonly broadcast: (text: string) => Effect.Effect<void>
  readonly status: () => Effect.Effect<Array<{ platform: string; connected: boolean; info: string }>>
  readonly onMessage: (handler: (msg: Message, permission: Permission) => void) => void
  readonly allowUser: (platform: string, userId: string, displayName: string, permission: Permission) => Effect.Effect<void>
  readonly denyUser: (platform: string, userId: string) => Effect.Effect<void>
  readonly setPermission: (platform: string, userId: string, permission: Permission) => Effect.Effect<void>
  readonly getUserPermission: (platform: string, userId: string) => Effect.Effect<Permission>
  readonly listUsers: (platform?: string) => Effect.Effect<Array<{ platform: string; userId: string; displayName: string; permission: string; active: boolean }>>
}

export class MessagingGateway extends Context.Service<MessagingGateway, GatewayInterface>()("@octocode/MessagingGateway") {}

function createAdapter(platform: string, config: Record<string, unknown>): PlatformAdapter {
  switch (platform) {
    case "telegram": return new TelegramAdapter(config as { botToken: string })
    case "discord": return new DiscordAdapter(config as { botToken: string; applicationId: string })
    case "email": return new EmailAdapter(config as any)
    case "webhook": return new WebhookAdapter(config as { port: number; path: string; secret?: string })
    default: throw new Error(`Unknown platform: ${platform}`)
  }
}

async function getUserPermission(platform: string, userId: string): Promise<Permission> {
  const rows = await Database.use((db) =>
    db.select().from(MessagingUsersTable).where(
      and(
        eq(MessagingUsersTable.platform, platform),
        eq(MessagingUsersTable.platform_user_id, userId),
        eq(MessagingUsersTable.active, 1),
      ),
    ).limit(1),
  )
  if (rows.length === 0) return "read-only"
  return rows[0].permission as Permission
}

function createGateway(): GatewayInterface {
  const adapters = new Map<string, PlatformAdapter>()
  let globalHandler: ((msg: Message, permission: Permission) => void) | null = null
  let self: GatewayInterface

  function handleMsg(msg: Message) {
    getUserPermission(msg.platform, msg.userId).then((permission) => {
      if (permission === "blocked") return

      if (isCommand(msg.text)) {
        const { command, args } = parseCommand(msg.text)
        const result = handleCommand(command, args, msg.userId, msg.platform, permission, self)
        if (result.handled) {
          const adapter = adapters.get(msg.platform)
          if (adapter) adapter.sendMessage(msg.chatId, result.response).catch(() => {})
          return
        }
      }

      if (globalHandler) globalHandler(msg, permission)
    })
  }

  const gw: GatewayInterface = {
    connect: (platform: string, config: Record<string, unknown>) =>
      Effect.gen(function* () {
        const adapter = createAdapter(platform, config)
        adapter.onMessage(handleMsg)
        yield* Effect.promise(() => adapter.start())
        adapters.set(platform, adapter)
      }),

    disconnect: (platform: string) =>
      Effect.gen(function* () {
        const adapter = adapters.get(platform)
        if (adapter) {
          yield* Effect.promise(() => adapter.stop())
          adapters.delete(platform)
        }
      }),

    send: (platform: string, chatId: string, text: string) =>
      Effect.gen(function* () {
        const adapter = adapters.get(platform)
        if (!adapter) throw new Error(`Platform ${platform} not connected`)
        return yield* Effect.promise(() => adapter.sendMessage(chatId, text))
      }),

    broadcast: (text: string) =>
      Effect.gen(function* () {
        for (const [, adapter] of adapters) {
          if (adapter.connected()) {
            try { yield* Effect.promise(() => adapter.sendMessage("broadcast", text)) } catch {}
          }
        }
      }),

    status: () =>
      Effect.sync(() => {
        const result: Array<{ platform: string; connected: boolean; info: string }> = []
        for (const [platform, adapter] of adapters) {
          const s = adapter.getStatus()
          result.push({ platform, connected: s.connected, info: s.info })
        }
        return result
      }),

    onMessage: (handler) => { globalHandler = handler },

    allowUser: (platform, userId, displayName, permission) =>
      Effect.gen(function* () {
        yield* Database.use((db) =>
          db.insert(MessagingUsersTable).values({
            platform,
            platform_user_id: userId,
            display_name: displayName,
            permission,
            added_at: Date.now(),
            added_by: "owner",
          }).onConflictDoUpdate({
            target: [MessagingUsersTable.platform, MessagingUsersTable.platform_user_id],
            set: { permission, display_name: displayName, active: 1 },
          }),
        )
      }),

    denyUser: (platform, userId) =>
      Effect.gen(function* () {
        yield* Database.use((db) =>
          db.update(MessagingUsersTable).set({ active: 0, permission: "blocked" }).where(
            and(eq(MessagingUsersTable.platform, platform), eq(MessagingUsersTable.platform_user_id, userId)),
          ),
        )
      }),

    setPermission: (platform, userId, permission) =>
      Effect.gen(function* () {
        yield* Database.use((db) =>
          db.update(MessagingUsersTable).set({ permission }).where(
            and(eq(MessagingUsersTable.platform, platform), eq(MessagingUsersTable.platform_user_id, userId)),
          ),
        )
      }),

    getUserPermission: (platform, userId) =>
      Effect.gen(function* () {
        return yield* Effect.promise(() => getUserPermission(platform, userId))
      }),

    listUsers: (platform?: string) =>
      Effect.gen(function* () {
        const where = platform ? eq(MessagingUsersTable.platform, platform) : undefined
        const rows = yield* Database.use((db) =>
          db.select().from(MessagingUsersTable).where(where),
        )
        return rows.map((r) => ({
          platform: r.platform,
          userId: r.platform_user_id,
          displayName: r.display_name,
          permission: r.permission,
          active: r.active === 1,
        }))
      }),
  }

  self = gw
  return gw
}

export const layer = Layer.effect(MessagingGateway, Effect.succeed(createGateway()))
export const defaultLayer = layer

export async function autoConnect() {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN
  if (telegramToken) {
    try {
      const { TelegramAdapter } = await import("./telegram")
      const bot = new TelegramAdapter({ botToken: telegramToken })
      bot.onMessage(async (msg) => {
        try {
          await bot.sendMessage(msg.chatId, `Echo: ${msg.text}\n\n(OctoCode v4.2.1 — full messaging integration pending)`)
        } catch {}
      })
      await bot.start()
      const me = await bot.getMe()
      console.log(`[messaging] Telegram bot connected: @${me.username}`)
    } catch (e: any) {
      console.error(`[messaging] Telegram failed: ${e.message}`)
    }
  }

  const discordToken = process.env.DISCORD_BOT_TOKEN
  const discordAppId = process.env.DISCORD_APP_ID
  if (discordToken && discordAppId) {
    try {
      const { DiscordAdapter } = await import("./discord")
      const bot = new DiscordAdapter({ botToken: discordToken, applicationId: discordAppId })
      bot.onMessage(async (msg) => {
        try {
          await bot.sendMessage(msg.chatId, `Echo: ${msg.text}\n\n(OctoCode v4.2.1 — full messaging integration pending)`)
        } catch {}
      })
      await bot.start()
      const me = await bot.getMe()
      console.log(`[messaging] Discord bot connected: ${me.username}`)
    } catch (e: any) {
      console.error(`[messaging] Discord failed: ${e.message}`)
    }
  }

  const smtpHost = process.env.EMAIL_SMTP_HOST
  if (smtpHost) {
    console.log("[messaging] Email notifications enabled")
  }
}
