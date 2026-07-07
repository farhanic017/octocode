import type { PlatformAdapter, Message } from "./types"

interface WebhookConfig {
  port: number
  path: string
  secret?: string
}

export class WebhookAdapter implements PlatformAdapter {
  readonly name = "webhook"
  private config: WebhookConfig
  private running = false
  private server: any = null
  private messageHandler: ((msg: Message) => void) | null = null
  private responses = new Map<string, { resolve: (id: string) => void }>()

  constructor(config: WebhookConfig) {
    this.config = config
  }

  connected() {
    return this.running
  }

  async start() {
    if (this.running) return

    const { Hono } = await import("hono")
    const app = new Hono()

    app.post(this.config.path, async (c) => {
      const body = await c.req.json()
      if (this.config.secret && body.secret !== this.config.secret) {
        return c.json({ error: "Invalid secret" }, 403)
      }
      const msg: Message = {
        platform: "webhook",
        userId: body.userId || body.user_id || "anonymous",
        chatId: body.chatId || body.chat_id || body.userId || "default",
        text: body.text || body.message || body.content || "",
        timestamp: body.timestamp || Date.now(),
        replyTo: body.replyTo || body.reply_to,
      }
      if (this.messageHandler) this.messageHandler(msg)
      return c.json({ ok: true })
    })

    app.get(this.config.path + "/status", (c) => {
      return c.json({ status: "ok", platform: "webhook", timestamp: Date.now() })
    })

    this.server = Bun.serve({
      fetch: app.fetch,
      port: this.config.port,
    })
    this.running = true
    console.log(`Webhook listening on port ${this.config.port}${this.config.path}`)
  }

  async stop() {
    if (this.server) {
      this.server.stop()
      this.server = null
    }
    this.running = false
  }

  async sendMessage(chatId: string, text: string): Promise<string> {
    return `webhook-${Date.now()}`
  }

  onMessage(handler: (msg: Message) => void) {
    this.messageHandler = handler
  }

  getStatus() {
    return {
      connected: this.running,
      platform: "webhook",
      info: this.running ? `Listening on port ${this.config.port}` : "Not started",
    }
  }

  getUrl(): string {
    return `http://localhost:${this.config.port}${this.config.path}`
  }
}
