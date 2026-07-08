import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"

export interface CrystallizeInput {
  taskDescription: string
  toolNames: string[]
  filesChanged: string[]
  messages: Array<{ role: string; content: string }>
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
}

function extractSteps(messages: Array<{ role: string; content: string }>): string[] {
  const steps: string[] = []
  for (const msg of messages) {
    if (msg.role === "assistant" && msg.content) {
      const lines = msg.content.split("\n").filter((l) => l.trim())
      for (const line of lines) {
        if (
          line.startsWith("I'll ") ||
          line.startsWith("Let me ") ||
          line.startsWith("Now ") ||
          line.startsWith("Next, ") ||
          line.includes("creating ") ||
          line.includes("editing ") ||
          line.includes("running ")
        ) {
          steps.push(line.trim())
        }
      }
    }
  }
  return steps.slice(0, 10)
}

export async function crystallizeSkill(input: CrystallizeInput): Promise<{ name: string; path: string } | undefined> {
  const slug = slugify(input.taskDescription)
  if (!slug) return undefined

  const skillDir = join(process.cwd(), ".opencode", "skills", "auto-generated")
  if (!existsSync(skillDir)) {
    mkdirSync(skillDir, { recursive: true })
  }

  const skillPath = join(skillDir, `${slug}.md`)

  if (existsSync(skillPath)) return undefined

  const steps = extractSteps(input.messages)
  const fileList = input.filesChanged.length > 0 ? input.filesChanged.slice(0, 10).join(", ") : "none"
  const toolList = input.toolNames.join(", ")

  const content = `---
name: ${slug}
description: Auto-generated skill from successful workflow: ${input.taskDescription.slice(0, 100)}
---

# ${input.taskDescription.slice(0, 100)}

## Workflow Steps

${steps.length > 0 ? steps.map((s, i) => `${i + 1}. ${s}`).join("\n") : "1. Complete the task as described"}

## Tools Used

${toolList}

## Files Involved

${fileList}

## Instructions

Follow the pattern established in this workflow to accomplish similar tasks.
`

  writeFileSync(skillPath, content, "utf-8")

  return { name: slug, path: skillPath }
}
