export interface Message {
  platform: string
  userId: string
  chatId: string
  text: string
  timestamp: number
  attachments?: Attachment[]
  replyTo?: string
}

export interface Attachment {
  type: "text" | "image" | "file" | "audio"
  url?: string
  data?: Buffer
  filename?: string
  mimeType?: string
}

export interface PlatformAdapter {
  readonly name: string
  readonly connected: () => boolean
  start(): Promise<void>
  stop(): Promise<void>
  sendMessage(chatId: string, text: string, options?: { replyTo?: string; parseMode?: string }): Promise<string>
  onMessage(handler: (msg: Message) => void): void
  getStatus(): { connected: boolean; platform: string; info: string }
}

export interface GatewayConfig {
  telegram?: { botToken: string }
  discord?: { botToken: string; applicationId: string }
  email?: { smtp: { host: string; port: number; user: string; pass: string }; imap: { host: string; port: number; user: string; pass: string } }
  webhook?: { port: number; path: string; secret?: string }
}
