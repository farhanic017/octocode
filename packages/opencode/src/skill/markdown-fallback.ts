export function parsePlainMarkdown(content: string): { name: string; description: string } | null {
  const nameMatch = content.match(/^#\s+(.+)$/m)
  if (!nameMatch) return null
  const name = nameMatch[1].trim()
  if (!name) return null

  const afterHeading = content.slice(content.indexOf(nameMatch[0]) + nameMatch[0].length)
  const descMatch = afterHeading.match(/^\s*>\s*(.+)$/m)
  const description = descMatch ? descMatch[1].trim() : ""

  return { name, description }
}
