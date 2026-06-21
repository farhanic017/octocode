// Simple Dynamic Session Naming
//
// Generates meaningful session names based on workspace context.
// No complex dependencies - just file system analysis.
import path from "path"
import * as fs from "fs/promises"

const PROJECT_INDICATORS: Record<string, string> = {
  "package.json": "Node",
  "tsconfig.json": "TypeScript",
  "Cargo.toml": "Rust",
  "go.mod": "Go",
  "pyproject.toml": "Python",
  "requirements.txt": "Python",
  "Gemfile": "Ruby",
  "pom.xml": "Java",
  "build.gradle": "Java",
  "CMakeLists.txt": "C++",
  "Makefile": "C/C++",
  "pubspec.yaml": "Dart",
  "Package.swift": "Swift",
  "docker-compose.yml": "Docker",
  "Dockerfile": "Docker",
}

const DIRECTORY_KEYWORDS: Record<string, string> = {
  src: "source",
  lib: "library",
  app: "app",
  components: "components",
  pages: "pages",
  routes: "routes",
  api: "api",
  utils: "utils",
  hooks: "hooks",
  services: "services",
  models: "models",
  controllers: "controllers",
  middleware: "middleware",
  tests: "tests",
  test: "test",
  docs: "docs",
  scripts: "scripts",
  config: "config",
}

function detectProjectType(files: string[]): string | undefined {
  for (const file of files) {
    const basename = path.basename(file)
    if (PROJECT_INDICATORS[basename]) {
      return PROJECT_INDICATORS[basename]
    }
  }
  return undefined
}

function extractKeyDirs(files: string[], worktree: string): string[] {
  const dirs = new Set<string>()
  for (const file of files.slice(0, 20)) {
    const relative = path.relative(worktree, file)
    const parts = relative.split(path.sep)
    for (const part of parts.slice(0, 2)) {
      const lower = part.toLowerCase()
      if (DIRECTORY_KEYWORDS[lower]) {
        dirs.add(DIRECTORY_KEYWORDS[lower])
      } else if (part && !part.startsWith(".") && part !== "node_modules") {
        dirs.add(part)
      }
    }
  }
  return Array.from(dirs).slice(0, 2)
}

export async function generateSessionName(directory: string, worktree: string): Promise<string> {
  const parts: string[] = []

  // Find key project files
  const keyFiles: string[] = []
  const patterns = ["package.json", "tsconfig.json", "Cargo.toml", "go.mod", "pyproject.toml"]

  try {
    const files = await fs.readdir(worktree)
    for (const pattern of patterns) {
      if (files.includes(pattern)) {
        keyFiles.push(path.join(worktree, pattern))
      }
    }
  } catch {}

  // Detect project type
  const projectType = detectProjectType(keyFiles)
  if (projectType) {
    parts.push(projectType)
  }

  // Get some source files to analyze
  let sourceFiles: string[] = []
  try {
    const srcDir = path.join(worktree, "src")
    const entries = await fs.readdir(srcDir, { withFileTypes: true })
    sourceFiles = entries
      .filter((e) => e.isFile() && (e.name.endsWith(".ts") || e.name.endsWith(".tsx") || e.name.endsWith(".js")))
      .slice(0, 10)
      .map((e) => path.join(srcDir, e.name))
  } catch {}

  // Extract key directories
  if (sourceFiles.length > 0) {
    const dirs = extractKeyDirs(sourceFiles, worktree)
    parts.push(...dirs)
  }

  // Deduplicate and limit
  const unique = [...new Set(parts)].slice(0, 3)

  if (unique.length === 0) {
    return "Workspace session"
  }

  return unique.join(" ")
}
