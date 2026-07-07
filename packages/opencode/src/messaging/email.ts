import type { PlatformAdapter, Message } from "./types"
import { createServer } from "net"
import { createTransport } from "nodemailer"

interface EmailConfig {
  smtp: { host: string; port: number; user: string; pass: string }
  imap?: { host: string; port: number; user: string; pass: string }
}

export class EmailAdapter implements PlatformAdapter {
  readonly name = "email"
  private config: EmailConfig
  private running = false
  private messageHandler: ((msg: Message) => void) | null = null

  constructor(config: EmailConfig) {
    this.config = config
  }

  connected() {
    return this.running
  }

  async start() {
    this.running = true
  }

  async stop() {
    this.running = false
  }

  async sendMessage(to: string, text: string): Promise<string> {
    const { default: nodemailer } = await import("nodemailer")
    const transporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.port === 465,
      auth: { user: this.config.smtp.user, pass: this.config.smtp.pass },
    })
    const info = await transporter.sendMail({
      from: this.config.smtp.user,
      to,
      subject: "OctoCode",
      text,
    })
    return info.messageId
  }

  onMessage(handler: (msg: Message) => void) {
    this.messageHandler = handler
  }

  getStatus() {
    return {
      connected: this.running,
      platform: "email",
      info: this.running ? `SMTP: ${this.config.smtp.host}:${this.config.smtp.port}` : "Not started",
    }
  }
}
