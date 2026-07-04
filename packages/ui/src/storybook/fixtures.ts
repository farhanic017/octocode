/*
 * OctoCode - Original UI/UX Design
 * Copyright (C) 2025 Farhan Dhrubo
 * Licensed under the GNU General Public License v3.0
 * https://www.gnu.org/licenses/gpl-3.0.html
 */

export const diff = {
  before: {
    name: "src/greet.ts",
    contents: `export function greet(name: string) {
  return \`Hello, \${name}!\`
}
`,
  },
  after: {
    name: "src/greet.ts",
    contents: `export function greet(name: string, excited = false) {
  const message = \`Hello, \${name}!\`
  return excited ? \`\${message}!!\` : message
}
`,
  },
}

export const code = {
  name: "src/calc.ts",
  contents: `export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export function average(values: number[]) {
  if (values.length === 0) return 0
  return sum(values) / values.length
}
`,
}

export const markdown = [
  "# Markdown",
  "",
  "Use **Markdown** for rich text.",
  "",
  "## Highlights",
  "- Headings, lists, and code blocks",
  "- Inline `code` and links",
  "",
  "```ts",
  "export const value = 42",
  "```",
  "",
  "More at https://example.com/docs",
].join("\n")

export const changes = {
  additions: 18,
  deletions: 6,
}

