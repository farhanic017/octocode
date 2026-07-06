// Nut-js runs in its own process — never locks the parent keyboard
const { mouse, keyboard, Point, Button, Key, screen } = require("@nut-tree-fork/nut-js")
const { execSync } = require("child_process")

const keyMap = {
  Enter: Key.Enter, Tab: Key.Tab, Escape: Key.Escape,
  Backspace: Key.Backspace, Delete: Key.Delete, Space: Key.Space,
  ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left, ArrowRight: Key.Right,
  Home: Key.Home, End: Key.End, PageUp: Key.PageUp, PageDown: Key.PageDown,
  LeftSuper: Key.LeftSuper, LeftControl: Key.LeftControl, LeftAlt: Key.LeftAlt, LeftShift: Key.LeftShift,
  S: Key.S, A: Key.A, C: Key.C, V: Key.V,
}

async function typeText(text) {
  // Use PowerShell SendKeys for fast bulk typing (instant vs character-by-character)
  const escaped = text.replace(/['"]/g, "'$&'")
  try {
    execSync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')"`,
      { windowsHide: true, timeout: 5000 }
    )
  } catch {
    // Fallback to nut-js character by character (slower but cross-platform)
    await keyboard.type(text)
  }
}

async function snapToRight() {
  // Snap current foreground window to right half of screen using Win+Right
  await keyboard.pressKey(Key.LeftSuper, Key.Right)
  await new Promise(r => setTimeout(r, 100))
  await keyboard.releaseKey(Key.LeftSuper, Key.Right)
}

async function snapToLeft() {
  await keyboard.pressKey(Key.LeftSuper, Key.Left)
  await new Promise(r => setTimeout(r, 100))
  await keyboard.releaseKey(Key.LeftSuper, Key.Left)
}

async function maximizeWindow() {
  await keyboard.pressKey(Key.LeftSuper, Key.Up)
  await new Promise(r => setTimeout(r, 100))
  await keyboard.releaseKey(Key.LeftSuper, Key.Up)
}

async function closeWindow() {
  await keyboard.pressKey(Key.LeftAlt, Key.F4)
  await new Promise(r => setTimeout(r, 100))
  await keyboard.releaseKey(Key.LeftAlt, Key.F4)
}

async function run(msg) {
  const args = msg.args

  switch (args.action) {
    case "click":
      await mouse.setPosition(new Point(args.x, args.y))
      await mouse.click(args.button === "right" ? Button.RIGHT : Button.LEFT)
      break
    case "double_click":
      await mouse.setPosition(new Point(args.x, args.y))
      await mouse.doubleClick(Button.LEFT)
      break
    case "move":
      await mouse.setPosition(new Point(args.x, args.y))
      break
    case "type":
      await typeText(args.text)
      break
    case "key":
      await keyboard.pressKey(keyMap[args.key] ?? Key[args.key])
      break
    case "key_combo":
      const comboKeys = args.keys.map(k => keyMap[k] ?? Key[k])
      await keyboard.pressKey(...comboKeys)
      await new Promise(r => setTimeout(r, 100))
      await keyboard.releaseKey(...comboKeys)
      break
    case "scroll":
      await mouse.setPosition(new Point(args.x, args.y))
      if (args.direction === "up") await mouse.scrollUp(args.amount ?? 3)
      else await mouse.scrollDown(args.amount ?? 3)
      break
    case "drag":
      await mouse.setPosition(new Point(args.from_x, args.from_y))
      await mouse.drag(new Point(args.to_x, args.to_y))
      break
    case "snap_right":
      await snapToRight()
      break
    case "snap_left":
      await snapToLeft()
      break
    case "maximize":
      await maximizeWindow()
      break
    case "close_window":
      await closeWindow()
      break
  }

  // Always release modifier keys after any keyboard action
  await keyboard.releaseKey(
    Key.LeftSuper, Key.LeftControl, Key.LeftAlt, Key.LeftShift,
    Key.RightSuper, Key.RightControl, Key.RightAlt, Key.RightShift
  )
}

process.on("message", async (msg) => {
  try {
    await run(msg)
    process.send({ id: msg.id, success: true })
  } catch (e) {
    process.send({ id: msg.id, success: false, error: e.message })
  } finally {
    process.exit(0)
  }
})
