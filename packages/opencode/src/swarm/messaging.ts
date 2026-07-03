export interface SwarmMessage {
  id: string
  sender: string
  recipient: string
  content: string
  timestamp: number
  threadId?: string
}

export interface SwarmThread {
  id: string
  participants: string[]
  messages: SwarmMessage[]
  createdAt: number
}

export class SwarmMessaging {
  private messages: SwarmMessage[]
  private threads: Map<string, SwarmThread>
  private counter: number
  private maxMessages: number

  constructor() {
    this.messages = []
    this.threads = new Map()
    this.counter = 0
    this.maxMessages = 10000
  }

  private makeId(): string {
    return (++this.counter).toString(36) + Math.random().toString(36).slice(2, 8)
  }

  sendMessage(sender: string, recipient: string, content: string): SwarmMessage {
    const msg: SwarmMessage = {
      id: this.makeId(),
      sender,
      recipient,
      content,
      timestamp: Date.now(),
    }
    this.messages.push(msg)
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages)
    }
    return msg
  }

  broadcast(sender: string, content: string, agents: string[]): SwarmMessage[] {
    const sent: SwarmMessage[] = []
    for (const agent of agents) {
      if (agent !== sender) {
        sent.push(this.sendMessage(sender, agent, `[BROADCAST from ${sender}]: ${content}`))
      }
    }
    return sent
  }

  startThread(sender: string, participants: string[], initialMessage: string): string {
    const threadId = this.makeId()
    const msg = this.sendMessage(sender, participants[0] ?? sender, initialMessage)
    msg.threadId = threadId

    this.threads.set(threadId, {
      id: threadId,
      participants: [sender, ...participants.filter((p) => p !== sender)],
      messages: [msg],
      createdAt: Date.now(),
    })

    return threadId
  }

  getThread(threadId: string): SwarmMessage[] {
    return this.threads.get(threadId)?.messages ?? []
  }

  getMessages(agentName: string, limit: number = 50): SwarmMessage[] {
    return this.messages
      .filter((m) => m.recipient === agentName || m.sender === agentName)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  getConversationSummary(agentName: string, limit: number = 10): string {
    const messages = this.getMessages(agentName, limit)
    if (messages.length === 0) return ""
    return messages
      .map((m) => `[${m.sender} → ${m.recipient}]: ${m.content.slice(0, 200)}`)
      .join("\n")
  }

  clear(): void {
    this.messages = []
    this.threads.clear()
  }
}
