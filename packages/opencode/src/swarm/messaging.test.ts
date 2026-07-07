import { describe, expect, test } from "bun:test"
import { SwarmMessaging } from "./messaging"

describe("SwarmMessaging", () => {
  test("send and receive messages", () => {
    const m = new SwarmMessaging()
    const msg = m.sendMessage("coder", "reviewer", "check my code")
    expect(msg.sender).toBe("coder")
    expect(msg.recipient).toBe("reviewer")
    expect(msg.content).toBe("check my code")
  })

  test("getMessages returns messages for agent", () => {
    const m = new SwarmMessaging()
    m.sendMessage("coder", "reviewer", "msg1")
    m.sendMessage("researcher", "reviewer", "msg2")
    m.sendMessage("coder", "writer", "msg3")
    const msgs = m.getMessages("reviewer")
    expect(msgs.length).toBe(2)
    expect(msgs.every((msg) => msg.recipient === "reviewer" || msg.sender === "reviewer")).toBe(true)
  })

  test("broadcast sends to all agents except sender", () => {
    const m = new SwarmMessaging()
    const sent = m.broadcast("coder", "task complete", ["coder", "reviewer", "writer"])
    expect(sent.length).toBe(2)
    expect(sent.every((msg) => msg.sender === "coder")).toBe(true)
    expect(sent.every((msg) => msg.content.includes("BROADCAST"))).toBe(true)
  })

  test("startThread creates thread with initial message", () => {
    const m = new SwarmMessaging()
    const threadId = m.startThread("coder", ["reviewer", "security"], "let's discuss the auth flow")
    expect(threadId).toBeTruthy()
    const thread = m.getThread(threadId)
    expect(thread.length).toBe(1)
    expect(thread[0].content).toBe("let's discuss the auth flow")
  })

  test("getConversationSummary formats messages", () => {
    const m = new SwarmMessaging()
    m.sendMessage("coder", "reviewer", "check the login code")
    m.sendMessage("reviewer", "coder", "looks good, ship it")
    const summary = m.getConversationSummary("reviewer")
    expect(summary).toContain("coder → reviewer")
    expect(summary).toContain("reviewer → coder")
  })

  test("getConversationSummary returns empty for no messages", () => {
    const m = new SwarmMessaging()
    expect(m.getConversationSummary("unknown")).toBe("")
  })

  test("clear removes all messages and threads", () => {
    const m = new SwarmMessaging()
    m.sendMessage("a", "b", "msg")
    m.startThread("a", ["b"], "thread msg")
    m.clear()
    expect(m.getMessages("a").length).toBe(0)
    expect(m.getMessages("b").length).toBe(0)
  })

  test("message IDs are unique", () => {
    const m = new SwarmMessaging()
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(m.sendMessage("a", "b", `msg ${i}`).id)
    }
    expect(ids.size).toBe(100)
  })
})
