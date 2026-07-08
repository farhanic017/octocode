import path from "path"
import fs from "fs/promises"
import { Filesystem } from "."

export interface KnowledgeNode {
  id: string
  type: "service" | "component" | "util" | "config" | "test" | "schema" | "file" | "plan" | "design" | "package"
  name: string
  filePath: string
  summary: string
  tags: string[]
  complexity: "simple" | "moderate" | "complex"
  metadata?: Record<string, any>
}

export interface KnowledgeEdge {
  source: string
  target: string
  type: "imports" | "uses" | "extends" | "implements" | "calls" | "depends" | "references"
  description: string
}

export interface KnowledgeGraph {
  version: string
  project: {
    name: string
    languages: string[]
    frameworks: string[]
    description: string
    analyzedAt: string
    gitCommitHash: string
  }
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export interface UnderstandMeta {
  lastAnalyzedAt: string
  gitCommitHash: string
  version: string
  analyzedFiles: number
}

const KNOWLEDGE_DIR = ".understand-anything"
const KNOWLEDGE_FILE = "knowledge-graph.json"
const META_FILE = "meta.json"
const IGNORE_FILE = ".understandignore"

export async function getKnowledgeDir(workspacePath: string): Promise<string> {
  const dir = path.join(workspacePath, KNOWLEDGE_DIR)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function readKnowledgeGraph(workspacePath: string): Promise<KnowledgeGraph | null> {
  try {
    const filePath = path.join(workspacePath, KNOWLEDGE_DIR, KNOWLEDGE_FILE)
    const exists = await Filesystem.exists(filePath)
    if (!exists) return null
    const content = await Filesystem.readText(filePath)
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function writeKnowledgeGraph(workspacePath: string, graph: KnowledgeGraph): Promise<void> {
  const dir = await getKnowledgeDir(workspacePath)
  const filePath = path.join(dir, KNOWLEDGE_FILE)
  await Filesystem.write(filePath, JSON.stringify(graph, null, 2))
}

export async function readMeta(workspacePath: string): Promise<UnderstandMeta | null> {
  try {
    const filePath = path.join(workspacePath, KNOWLEDGE_DIR, META_FILE)
    const exists = await Filesystem.exists(filePath)
    if (!exists) return null
    const content = await Filesystem.readText(filePath)
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function writeMeta(workspacePath: string, meta: UnderstandMeta): Promise<void> {
  const dir = await getKnowledgeDir(workspacePath)
  const filePath = path.join(dir, META_FILE)
  await Filesystem.write(filePath, JSON.stringify(meta, null, 2))
}

export async function readIgnorePatterns(workspacePath: string): Promise<string[]> {
  try {
    const filePath = path.join(workspacePath, KNOWLEDGE_DIR, IGNORE_FILE)
    const exists = await Filesystem.exists(filePath)
    if (!exists) return []
    const content = await Filesystem.readText(filePath)
    return content
      .split("\n")
      .filter((line: string) => line.trim() && !line.startsWith("#"))
      .map((line: string) => line.trim())
  } catch {
    return []
  }
}

export function createNode(
  id: string,
  type: KnowledgeNode["type"],
  name: string,
  filePath: string,
  summary: string,
  tags: string[],
  complexity: KnowledgeNode["complexity"] = "moderate",
  metadata?: Record<string, any>,
): KnowledgeNode {
  return { id, type, name, filePath, summary, tags, complexity, metadata }
}

export function createEdge(
  source: string,
  target: string,
  type: KnowledgeEdge["type"],
  description: string,
): KnowledgeEdge {
  return { source, target, type, description }
}

export function mergeGraphs(existing: KnowledgeGraph, incoming: KnowledgeGraph): KnowledgeGraph {
  const nodeMap = new Map(existing.nodes.map((n) => [n.id, n]))
  for (const node of incoming.nodes) {
    nodeMap.set(node.id, node)
  }

  const edgeSet = new Set(existing.edges.map((e) => `${e.source}|${e.target}|${e.type}`))
  const mergedEdges = [...existing.edges]
  for (const edge of incoming.edges) {
    const key = `${edge.source}|${edge.target}|${edge.type}`
    if (!edgeSet.has(key)) {
      mergedEdges.push(edge)
      edgeSet.add(key)
    }
  }

  return {
    ...incoming,
    nodes: Array.from(nodeMap.values()),
    edges: mergedEdges,
  }
}

export async function addKnowledge(
  workspacePath: string,
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  projectInfo?: Partial<KnowledgeGraph["project"]>,
): Promise<KnowledgeGraph> {
  const existing = await readKnowledgeGraph(workspacePath)
  const incoming: KnowledgeGraph = {
    version: "1.0.0",
    project: {
      name: projectInfo?.name || path.basename(workspacePath),
      languages: projectInfo?.languages || [],
      frameworks: projectInfo?.frameworks || [],
      description: projectInfo?.description || "",
      analyzedAt: new Date().toISOString(),
      gitCommitHash: projectInfo?.gitCommitHash || "",
    },
    nodes,
    edges,
  }

  const merged = existing ? mergeGraphs(existing, incoming) : incoming
  await writeKnowledgeGraph(workspacePath, merged)

  const meta: UnderstandMeta = {
    lastAnalyzedAt: new Date().toISOString(),
    gitCommitHash: incoming.project.gitCommitHash,
    version: "1.0.0",
    analyzedFiles: merged.nodes.length,
  }
  await writeMeta(workspacePath, meta)

  return merged
}

export function formatKnowledgeForPrompt(graph: KnowledgeGraph): string {
  const lines: string[] = []
  lines.push(`## Knowledge Graph: ${graph.project.name}`)
  lines.push(`Description: ${graph.project.description}`)
  lines.push(`Languages: ${graph.project.languages.join(", ")}`)
  lines.push(`Frameworks: ${graph.project.frameworks.join(", ")}`)
  lines.push(`Analyzed: ${graph.project.analyzedAt}`)
  lines.push(`Files tracked: ${graph.nodes.length}`)
  lines.push("")

  lines.push("### Key Components")
  for (const node of graph.nodes.slice(0, 50)) {
    lines.push(`- **${node.name}** (${node.type}): ${node.summary}`)
    lines.push(`  Path: ${node.filePath}`)
    lines.push(`  Tags: ${node.tags.join(", ")}`)
  }

  if (graph.edges.length > 0) {
    lines.push("")
    lines.push("### Relationships")
    for (const edge of graph.edges.slice(0, 30)) {
      lines.push(`- ${edge.source} → ${edge.target} (${edge.type}): ${edge.description}`)
    }
  }

  return lines.join("\n")
}
