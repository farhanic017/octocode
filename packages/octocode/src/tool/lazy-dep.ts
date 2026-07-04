import { execSync } from "child_process"

const installedCache = new Set<string>()

export async function requireDep(name: string): Promise<any> {
  if (installedCache.has(name)) {
    return import(name)
  }

  try {
    const mod = await import(name)
    installedCache.add(name)
    return mod
  } catch {
    console.log(`\nInstalling required dependency: ${name}...`)
    try {
      execSync(`npm install -g ${name}`, { stdio: "inherit", timeout: 120000 })
      const mod = await import(name)
      installedCache.add(name)
      return mod
    } catch (e) {
      throw new Error(
        `Failed to install ${name}. Install manually:\n  npm install -g ${name}\n\nError: ${e instanceof Error ? e.message : e}`
      )
    }
  }
}
