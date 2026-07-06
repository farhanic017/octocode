// Persistent nut-js worker — stays alive, handles multiple actions without respawning
const { mouse, keyboard, Point, Button, Key, screen } = require("@nut-tree-fork/nut-js")
const { execSync } = require("child_process")

const keyMap = {
  Enter: Key.Enter, Tab: Key.Tab, Escape: Key.Escape,
  Backspace: Key.Backspace, Delete: Key.Delete, Space: Key.Space,
  ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left, ArrowRight: Key.Right,
  Home: Key.Home, End: Key.End, PageUp: Key.PageUp, PageDown: Key.PageDown,
  LeftSuper: Key.LeftSuper, LeftControl: Key.LeftControl, LeftAlt: Key.LeftAlt, LeftShift: Key.LeftShift,
  S: Key.S, A: Key.A, C: Key.C, V: Key.V, N: Key.N,
}

async function typeText(text) {
  const escaped = text.replace(/['"]/g, "'$&'")
  try {
    execSync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')"`,
      { windowsHide: true, timeout: 5000 }
    )
  } catch {
    await keyboard.type(text)
  }
}

async function clipPaste(text) {
  const escaped = text.replace(/'/g, "''")
  try {
    execSync(`powershell -Command "Set-Clipboard -Value '${escaped}'"`, { windowsHide: true, timeout: 3000 })
    await keyboard.pressKey(Key.LeftControl, Key.V)
    await new Promise(r => setTimeout(r, 50))
    await keyboard.releaseKey(Key.LeftControl, Key.V)
  } catch {
    await typeText(text)
  }
}

async function runSingle(args) {
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
    case "clip_paste":
      await clipPaste(args.text)
      break
    case "key":
      await keyboard.pressKey(keyMap[args.key] ?? Key[args.key])
      break
    case "key_combo":
      const comboKeys = args.keys.map(k => keyMap[k] ?? Key[k])
      await keyboard.pressKey(...comboKeys)
      await new Promise(r => setTimeout(r, 80))
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
      await keyboard.pressKey(Key.LeftSuper, Key.Right)
      await new Promise(r => setTimeout(r, 80))
      await keyboard.releaseKey(Key.LeftSuper, Key.Right)
      break
    case "snap_left":
      await keyboard.pressKey(Key.LeftSuper, Key.Left)
      await new Promise(r => setTimeout(r, 80))
      await keyboard.releaseKey(Key.LeftSuper, Key.Left)
      break
    case "maximize":
      await keyboard.pressKey(Key.LeftSuper, Key.Up)
      await new Promise(r => setTimeout(r, 80))
      await keyboard.releaseKey(Key.LeftSuper, Key.Up)
      break
    case "minimize":
      await keyboard.pressKey(Key.LeftSuper, Key.Down)
      await new Promise(r => setTimeout(r, 80))
      await keyboard.releaseKey(Key.LeftSuper, Key.Down)
      break
    case "snap_top_left":
      await keyboard.pressKey(Key.LeftSuper, Key.Left)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Left)
      await new Promise(r => setTimeout(r, 100))
      await keyboard.pressKey(Key.LeftSuper, Key.Up)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Up)
      break
    case "snap_top_right":
      await keyboard.pressKey(Key.LeftSuper, Key.Right)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Right)
      await new Promise(r => setTimeout(r, 100))
      await keyboard.pressKey(Key.LeftSuper, Key.Up)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Up)
      break
    case "snap_bottom_left":
      await keyboard.pressKey(Key.LeftSuper, Key.Left)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Left)
      await new Promise(r => setTimeout(r, 100))
      await keyboard.pressKey(Key.LeftSuper, Key.Down)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Down)
      break
    case "snap_bottom_right":
      await keyboard.pressKey(Key.LeftSuper, Key.Right)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Right)
      await new Promise(r => setTimeout(r, 100))
      await keyboard.pressKey(Key.LeftSuper, Key.Down)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Down)
      break
    case "close_window":
      await keyboard.pressKey(Key.LeftAlt, Key.F4)
      await new Promise(r => setTimeout(r, 80))
      await keyboard.releaseKey(Key.LeftAlt, Key.F4)
      break
    case "task_view":
      await keyboard.pressKey(Key.LeftSuper, Key.Tab)
      await new Promise(r => setTimeout(r, 50))
      await keyboard.releaseKey(Key.LeftSuper, Key.Tab)
      break
  }
  await keyboard.releaseKey(
    Key.LeftSuper, Key.LeftControl, Key.LeftAlt, Key.LeftShift,
    Key.RightSuper, Key.RightControl, Key.RightAlt, Key.RightShift
  )
}

process.on("message", async (msg) => {
  try {
    if (msg.batch) {
      for (const action of msg.batch) {
        await runSingle(action)
        if (action.delay) await new Promise(r => setTimeout(r, action.delay))
      }
      process.send({ id: msg.id, success: true })
    } else {
      await runSingle(msg.args)
      process.send({ id: msg.id, success: true })
    }
  } catch (e) {
    process.send({ id: msg.id, success: false, error: e.message })
  }
})
