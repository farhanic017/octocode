import type { PlatformAdapter, Message, Attachment } from "./types"

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    text?: string
    date: number
    reply_to_message?: { message_id: number }
    photo?: { file_id: string }[]
    document?: { file_id: string; file_name?: string; mime_type?: string }
    voice?: { file_id: string }
  }
}

export class TelegramAdapter implements PlatformAdapter {
  readonly name = "telegram"
  private token: string
  private pollOffset = 0
  private running = false
  private messageHandler: ((msg: Message) => void) | null = null
  private pollTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config: { botToken: string }) {
    this.token = config.botToken
  }

  connected() {
    return this.running
  }

  private async api(method: string, body: Record<string, unknown> = {}): Promise<any> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(`Telegram API error: ${data.description}`)
    return data.result
  }

  async start() {
    if (this.running) return
    this.running = true
    await this.poll()
  }

  async stop() {
    this.running = false
    if (this.pollTimer) clearTimeout(this.pollTimer)
  }

  private async poll() {
    if (!this.running) return
    try {
      const updates = await this.api("getUpdates", {
        offset: this.pollOffset,
        timeout: 30,
        allowed_updates: ["message"],
      })
      for (const update of updates) {
        this.pollOffset = update.update_id + 1
        if (update.message && this.messageHandler) {
          const msg = this.parseMessage(update)
          if (msg) this.messageHandler(msg)
        }
      }
    } catch (e) {
      console.error("Telegram poll error:", e)
    }
    if (this.running) {
      this.pollTimer = setTimeout(() => this.poll(), 100)
    }
  }

  private parseMessage(update: TelegramUpdate): Message | null {
    const m = update.message
    if (!m || !m.text) return null
    return {
      platform: "telegram",
      userId: String(m.from.id),
      chatId: String(m.chat.id),
      text: m.text,
      timestamp: m.date * 1000,
      replyTo: m.reply_to_message ? String(m.reply_to_message.message_id) : undefined,
    }
  }

  async sendMessage(chatId: string, text: string, options?: { replyTo?: string; parseMode?: string }): Promise<string> {
    const result = await this.api("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode || "Markdown",
      reply_to_message_id: options?.replyTo ? Number(options.replyTo) : undefined,
    })
    return String(result.message_id)
  }

  onMessage(handler: (msg: Message) => void) {
    this.messageHandler = handler
  }

  getStatus() {
    return {
      connected: this.running,
      platform: "telegram",
      info: this.running ? `Bot active (offset: ${this.pollOffset})` : "Not started",
    }
  }

  async getMe(): Promise<{ username: string; first_name: string }> {
    return this.api("getMe")
  }
}
