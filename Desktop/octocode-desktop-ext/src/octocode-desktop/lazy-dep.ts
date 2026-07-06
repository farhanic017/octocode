import { execSync } from "child_process"

const installed = new Set<string>()

export async function ensureDep(name: string): Promise<void> {
  if (installed.has(name)) return
  try {
    require.resolve(name)
    installed.add(name)
  } catch {
    console.log(`Installing ${name}...`)
    execSync(`npm install -g ${name}`, { stdio: "inherit" })
    installed.add(name)
  }
}
