// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
// Injected into browser pages for visual agent feedback
// Shows a visible cursor that moves to click targets

function injectVisualFeedback() {
  if (window.__octocodeFeedback) return
  window.__octocodeFeedback = true

  const style = document.createElement("style")
  style.textContent = `
    .octo-cursor {
      position: fixed;
      width: 20px;
      height: 20px;
      pointer-events: none;
      z-index: 9999999;
      transition: left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                  top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .octo-cursor svg {
      width: 20px;
      height: 20px;
      filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));
    }
    .octo-cursor-clicking svg {
      transform: scale(0.85);
    }
    .octo-click-ripple {
      position: fixed;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid #ff3b3b;
      pointer-events: none;
      z-index: 999998;
      animation: octo-ripple 0.6s ease-out forwards;
    }
    @keyframes octo-ripple {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
    }
    .octo-type-cursor {
      position: fixed;
      width: 2px;
      height: 18px;
      background: #ff3b3b;
      pointer-events: none;
      z-index: 999999;
      animation: octo-blink 0.5s step-end infinite;
    }
    @keyframes octo-blink {
      50% { opacity: 0; }
    }
    .octo-hover-ring {
      position: fixed;
      border: 2px dashed #3b82f6;
      border-radius: 4px;
      pointer-events: none;
      z-index: 999997;
      transition: all 0.3s ease;
    }
    .octo-label {
      position: fixed;
      background: #1e1e1e;
      color: #fff;
      font: 12px monospace;
      padding: 3px 8px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 999999;
      white-space: nowrap;
      animation: octo-fade 2s ease-out forwards;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    @keyframes octo-fade {
      0% { opacity: 1; transform: translateY(0); }
      80% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-15px); }
    }
    .octo-trail-dot {
      position: fixed;
      width: 6px;
      height: 6px;
      background: rgba(255, 59, 59, 0.6);
      border-radius: 50%;
      pointer-events: none;
      z-index: 999996;
      animation: octo-trail-fade 1s ease-out forwards;
    }
    @keyframes octo-trail-fade {
      0% { opacity: 0.8; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.2); }
    }
    .octo-pulse {
      position: fixed;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 59, 59, 0.15);
      pointer-events: none;
      z-index: 999995;
      animation: octo-pulse 1s ease-out forwards;
    }
    @keyframes octo-pulse {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
    }
  `
  document.head.appendChild(style)



  // Create visible cursor
  const cursor = document.createElement("div")
  cursor.className = "octo-cursor"
  cursor.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 3l14 8-6 2-2 6z" fill="#ff3b3b" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`
  cursor.style.left = "-100px"
  cursor.style.top = "-100px"
  document.body.appendChild(cursor)

  let cursorX = -100
  let cursorY = -100

  // Move cursor smoothly
  window.__octoMoveCursor = function(x, y) {
    cursorX = x
    cursorY = y
    cursor.style.left = x + "px"
    cursor.style.top = y + "px"

    // Trail dots during movement
    const dot = document.createElement("div")
    dot.className = "octo-trail-dot"
    dot.style.left = x - 3 + "px"
    dot.style.top = y - 3 + "px"
    document.body.appendChild(dot)
    setTimeout(() => dot.remove(), 1000)
  }

  // Click ripple + cursor animation
  window.__octoClick = function(x, y) {
    // Move cursor to target first
    cursor.style.left = x + "px"
    cursor.style.top = y + "px"
    cursor.classList.add("octo-cursor-clicking")

    // Pulse at click point
    const pulse = document.createElement("div")
    pulse.className = "octo-pulse"
    pulse.style.left = x + "px"
    pulse.style.top = y + "px"
    document.body.appendChild(pulse)
    setTimeout(() => pulse.remove(), 1000)

    // Ripple
    setTimeout(() => {
      const el = document.createElement("div")
      el.className = "octo-click-ripple"
      el.style.left = x + "px"
      el.style.top = y + "px"
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 600)
    }, 200)

    // Label
    const label = document.createElement("div")
    label.className = "octo-label"
    label.textContent = "click"
    label.style.left = x + 25 + "px"
    label.style.top = y - 10 + "px"
    document.body.appendChild(label)
    setTimeout(() => label.remove(), 2000)

    setTimeout(() => cursor.classList.remove("octo-cursor-clicking"), 300)
  }

  // Smooth move to selector then click
  window.__octoMoveToAndClick = function(selector) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector)
      if (!el) { resolve(); return }
      const rect = el.getBoundingClientRect()
      const targetX = rect.x + rect.width / 2
      const targetY = rect.y + rect.height / 2

      // Animate cursor movement in steps
      const steps = 15
      const startX = cursorX
      const startY = cursorY
      let step = 0

      const interval = setInterval(() => {
        step++
        const progress = step / steps
        const ease = 1 - Math.pow(1 - progress, 3) // ease out cubic
        const currentX = startX + (targetX - startX) * ease
        const currentY = startY + (targetY - startY) * ease
        window.__octoMoveCursor(currentX, currentY)

        if (step >= steps) {
          clearInterval(interval)
          window.__octoClick(targetX, targetY)
          resolve()
        }
      }, 25)
    })
  }

  // Type animation
  window.__octoType = function(selector, text) {
    const el = document.querySelector(selector)
    if (!el) return
    const rect = el.getBoundingClientRect()

    const typeCursor = document.createElement("div")
    typeCursor.className = "octo-type-cursor"
    typeCursor.style.left = rect.left + 5 + "px"
    typeCursor.style.top = rect.top + 2 + "px"
    document.body.appendChild(typeCursor)

    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) {
        clearInterval(interval)
        setTimeout(() => typeCursor.remove(), 500)
        return
      }
      typeCursor.style.left = rect.left + 5 + (i * 8) + "px"
      i++
    }, 40)

    const label = document.createElement("div")
    label.className = "octo-label"
    label.textContent = "typing: " + text.slice(0, 25) + (text.length > 25 ? "..." : "")
    label.style.left = rect.left + "px"
    label.style.top = rect.top - 25 + "px"
    document.body.appendChild(label)
    setTimeout(() => label.remove(), 2000)
  }

  // Hover highlight
  window.__octoHover = function(selector) {
    const el = document.querySelector(selector)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ring = document.createElement("div")
    ring.className = "octo-hover-ring"
    ring.style.left = rect.left - 3 + "px"
    ring.style.top = rect.top - 3 + "px"
    ring.style.width = rect.width + 6 + "px"
    ring.style.height = rect.height + 6 + "px"
    document.body.appendChild(ring)
    setTimeout(() => ring.remove(), 1200)
  }

  // Label
  window.__octoLabel = function(text, x, y) {
    const label = document.createElement("div")
    label.className = "octo-label"
    label.textContent = text
    label.style.left = (x || 20) + "px"
    label.style.top = (y || 20) + "px"
    document.body.appendChild(label)
    setTimeout(() => label.remove(), 2000)
  }
}

injectVisualFeedback()
