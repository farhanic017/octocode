import type { PlatformAdapter, Message } from "./types"

interface DiscordGatewayEvent {
  op: number
  d: any
  s: number | null
  t: string | null
}

export class DiscordAdapter implements PlatformAdapter {
  readonly name = "discord"
  private token: string
  private applicationId: string
  private ws: WebSocket | null = null
  private running = false
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private sequence: number | null = null
  private sessionId: string | null = null
  private resumeGatewayUrl: string | null = null
  private messageHandler: ((msg: Message) => void) | null = null
  private heartbeatAck = false

  constructor(config: { botToken: string; applicationId: string }) {
    this.token = config.botToken
    this.applicationId = config.applicationId
  }

  connected() {
    return this.running && this.ws !== null
  }

  async start() {
    if (this.running) return
    this.running = true
    try {
      const res = await fetch("https://discord.com/api/v10/gateway")
      const data = await res.json()
      this.connect(data.url + "?v=10&encoding=json")
    } catch (e) {
      console.error("Discord gateway error:", e)
      this.running = false
    }
  }

  async stop() {
    this.running = false
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.ws) this.ws.close()
  }

  private connect(url: string) {
    this.ws = new WebSocket(url)

    this.ws.onopen = () => console.log("Discord gateway connected")

    this.ws.onmessage = async (event) => {
      const data: DiscordGatewayEvent = JSON.parse(String(event.data))
      if (data.s !== null) this.sequence = data.s

      switch (data.op) {
        case 10:
          this.sessionId = data.d.session_id
          this.resumeGatewayUrl = data.d.resume_gateway_url
          this.startHeartbeat(data.d.heartbeat_interval)
          await this.identify()
          break
        case 11:
          this.heartbeatAck = true
          break
        case 0:
          this.handleEvent(data.t, data.d)
          break
        case 7:
          this.ws?.close()
          setTimeout(() => this.connect(this.resumeGatewayUrl || url), 1000)
          break
      }
    }

    this.ws.onerror = (e) => console.error("Discord WS error:", e)
    this.ws.onclose = () => {
      this.running = false
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
      if (this.running) setTimeout(() => this.start(), 5000)
    }
  }

  private startHeartbeat(interval: number) {
    this.heartbeatTimer = setInterval(() => {
      if (!this.heartbeatAck) {
        this.ws?.close()
        return
      }
      this.heartbeatAck = false
      this.ws?.send(JSON.stringify({ op: 1, d: this.sequence }))
    }, interval)
  }

  private async identify() {
    this.ws?.send(JSON.stringify({
      op: 2,
      d: {
        token: this.token,
        intents: 513,
        properties: { os: "windows", browser: "octocode", device: "octocode" },
      },
    }))
  }

  private handleEvent(event: string | null, data: any) {
    if (event !== "MESSAGE_CREATE" || !this.messageHandler) return
    if (data.author.bot) return

    const msg: Message = {
      platform: "discord",
      userId: data.author.id,
      chatId: data.channel_id,
      text: data.content,
      timestamp: new Date(data.timestamp).getTime(),
      replyTo: data.message_reference?.message_id,
    }
    this.messageHandler(msg)
  }

  async sendMessage(chatId: string, text: string, options?: { replyTo?: string }): Promise<string> {
    const body: Record<string, unknown> = { content: text }
    if (options?.replyTo) body.message_reference = { message_id: options.replyTo }

    const res = await fetch(`https://discord.com/api/v10/channels/${chatId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${this.token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return data.id
  }

  onMessage(handler: (msg: Message) => void) {
    this.messageHandler = handler
  }

  getStatus() {
    return {
      connected: this.running && this.ws !== null,
      platform: "discord",
      info: this.running ? `Bot connected (session: ${this.sessionId?.slice(0, 8)}...)` : "Not started",
    }
  }

  async getMe(): Promise<{ username: string; id: string }> {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${this.token}` },
    })
    return res.json()
  }
}
