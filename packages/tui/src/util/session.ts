export function isDefaultTitle(title: string) {
  if (!title) return true
  if (/^(New session - |Child session - )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(title)) return true
  if (title === "Untitled") return true
  if (title.length <= 3) return true
  return false
}
