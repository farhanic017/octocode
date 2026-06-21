import os

os.chdir(r'C:\Users\Farhan\Desktop\octo code')

with open(r'packages\tui\src\context\sync.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Move buffer replay INSIDE produce() callback where draft is in scope
old_bug = '''          setStore(
            "part",
            event.properties.part.messageID,
            produce((draft) => {
              draft.splice(result.index, 0, event.properties.part)
            }),
          )
          // Replay any deltas that were buffered before this part existed
          const buffered = deltaBuffer.get(event.properties.part.messageID)?.get(event.properties.part.id)
          if (buffered) {
            deltaBuffer.get(event.properties.part.messageID)!.delete(event.properties.part.id)
            for (const d of buffered) {
              const part = draft[result.index]
              const field = d.field as keyof typeof part
              const existing = part[field] as string | undefined
              ;(part[field] as string) = (existing ?? "") + d.delta
            }
          }'''

new_fixed = '''          setStore(
            "part",
            event.properties.part.messageID,
            produce((draft) => {
              draft.splice(result.index, 0, event.properties.part)
              const bufReplay = deltaBuffer.get(event.properties.part.messageID)?.get(event.properties.part.id)
              if (bufReplay) {
                deltaBuffer.get(event.properties.part.messageID)!.delete(event.properties.part.id)
                const part = draft[result.index]
                for (const d of bufReplay) {
                  const field = d.field as keyof typeof part
                  const existing = part[field] as string | undefined
                  ;(part[field] as string) = (existing ?? "") + d.delta
                }
              }
            }),
          )'''

if old_bug in content:
    content = content.replace(old_bug, new_fixed)
    print('Fix 1 applied - moved buffer replay inside produce()')
else:
    print('Fix 1 FAILED - old_bug not found')

# Fix 2: Also merge the empty-parts replay into a single setStore
old_empty = '''          if (!parts) {
            setStore("part", event.properties.part.messageID, [event.properties.part])
            // Replay any deltas that were buffered before this part existed
            const bufReplay = deltaBuffer.get(event.properties.part.messageID)?.get(event.properties.part.id)
            if (bufReplay) {
              deltaBuffer.get(event.properties.part.messageID)!.delete(event.properties.part.id)
              const newPart = { ...event.properties.part }
              for (const d of bufReplay) {
                const field = d.field as keyof typeof newPart
                const existing = newPart[field] as string | undefined
                ;(newPart[field] as string) = (existing ?? "") + d.delta
              }
              setStore("part", event.properties.part.messageID, [newPart])
            }
            break
          }'''

new_empty = '''          if (!parts) {
            const bufReplay = deltaBuffer.get(event.properties.part.messageID)?.get(event.properties.part.id)
            if (bufReplay) {
              deltaBuffer.get(event.properties.part.messageID)!.delete(event.properties.part.id)
              const newPart = { ...event.properties.part }
              for (const d of bufReplay) {
                const field = d.field as keyof typeof newPart
                const existing = newPart[field] as string | undefined
                ;(newPart[field] as string) = (existing ?? "") + d.delta
              }
              setStore("part", event.properties.part.messageID, [newPart])
            } else {
              setStore("part", event.properties.part.messageID, [event.properties.part])
            }
            break
          }'''

if old_empty in content:
    content = content.replace(old_empty, new_empty)
    print('Fix 2 applied - merged empty-parts path')
else:
    print('Fix 2 FAILED - old_empty not found')

with open(r'packages\tui\src\context\sync.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
