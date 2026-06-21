import os

os.chdir(r'C:\Users\Farhan\Desktop\octo code')

with open(r'packages\tui\src\component\prompt\index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The right side of home dock controls — add streaming indicator before model name
old = '''      <box flexDirection="row" gap={1} alignItems="center">
        <box
          onMouseOver={() => setHomeControlHover("model")}
          onMouseOut={() => setHomeControlHover(null)}
          onMouseUp={() => keymap.dispatchCommand("model.list")}
        >
          <text fg={homeControlHover() === "model" ? HOME_DOCK_TEXT : HOME_DOCK_TEXT_MUTED} wrapMode="none">
            {Locale.truncate(local.model.parsed().model, 16)}
          </text>
        </box>
        {homeDockButton({'''

new = '''      <box flexDirection="row" gap={1} alignItems="center">
        <Show when={status().type !== "idle"}>
          <box flexDirection="row" gap={1} alignItems="center">
            <Show when={kv.get("animations_enabled", true)} fallback={<text fg={HOME_DOCK_TEXT_MUTED}>[⋯]</text>}>
              <spinner color={spinnerDef().color} frames={spinnerDef().frames} interval={40} />
            </Show>
            <text fg={store.interrupt > 0 ? HOME_DOCK_TEXT : HOME_DOCK_TEXT_MUTED}>
              esc <span style={{ fg: store.interrupt > 0 ? HOME_DOCK_TEXT : HOME_DOCK_TEXT_MUTED }}>{store.interrupt > 0 ? "again to interrupt" : "cancel"}</span>
            </text>
          </box>
        </Show>
        <box
          onMouseOver={() => setHomeControlHover("model")}
          onMouseOut={() => setHomeControlHover(null)}
          onMouseUp={() => keymap.dispatchCommand("model.list")}
        >
          <text fg={homeControlHover() === "model" ? HOME_DOCK_TEXT : HOME_DOCK_TEXT_MUTED} wrapMode="none">
            {Locale.truncate(local.model.parsed().model, 16)}
          </text>
        </box>
        {homeDockButton({'''

if old in content:
    content = content.replace(old, new)
    print('Home dock streaming indicator added')
else:
    print('FAIL - old pattern not found')
    idx = content.find('flexDirection="row" gap={1} alignItems="center">')
    if idx >= 0:
        print(f'Found layout at index {idx}: {repr(content[idx:idx+100])}')
    else:
        print('Could not find layout pattern')

with open(r'packages\tui\src\component\prompt\index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
