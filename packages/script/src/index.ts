import { $ } from "bun"
import path from "path"

const env = {
  OCTOCODE_CHANNEL: process.env["OCTOCODE_CHANNEL"],
  OCTOCODE_BUMP: process.env["OCTOCODE_BUMP"],
  OCTOCODE_VERSION: process.env["OCTOCODE_VERSION"],
  OCTOCODE_RELEASE: process.env["OCTOCODE_RELEASE"],
}
const CHANNEL = await (async () => {
  if (env.OCTOCODE_CHANNEL) return env.OCTOCODE_CHANNEL
  if (env.OCTOCODE_BUMP) return "latest"
  if (env.OCTOCODE_VERSION && !env.OCTOCODE_VERSION.startsWith("0.0.0-")) return "latest"
  return await $`git branch --show-current`.text().then((x) => x.trim())
})()
const IS_PREVIEW = CHANNEL !== "latest"

const VERSION = await (async () => {
  if (env.OCTOCODE_VERSION) return env.OCTOCODE_VERSION
  if (IS_PREVIEW) return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`
  const version = await fetch("https://registry.npmjs.org/octocode-ai/latest")
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText)
      return res.json()
    })
    .then((data: any) => data.version)
  const [major, minor, patch] = version.split(".").map((x: string) => Number(x) || 0)
  const t = env.OCTOCODE_BUMP?.toLowerCase()
  if (t === "major") return `${major + 1}.0.0`
  if (t === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
})()

const bot = ["actions-user", "octo", "octocode-agent[bot]"]
const teamPath = path.resolve(import.meta.dir, "../../../.github/TEAM_MEMBERS")
const team = [
  ...(await Bun.file(teamPath)
    .text()
    .then((x) => x.split(/\r?\n/).map((x) => x.trim()))
    .then((x) => x.filter((x) => x && !x.startsWith("#")))),
  ...bot,
]

export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get preview() {
    return IS_PREVIEW
  },
  get release(): boolean {
    return !!env.OCTOCODE_RELEASE
  },
  get team() {
    return team
  },
}
console.log(`octocode script`, JSON.stringify(Script, null, 2))
