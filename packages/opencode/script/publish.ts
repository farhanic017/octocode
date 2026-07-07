#!/usr/bin/env bun
import { $ } from "bun"
import fs from "fs"
import pkg from "../package.json"
import { Script } from "@octo-ai/script"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(dir)
  if (await published(name, version)) {
    console.log(`already published ${name}@${version}`)
    return
  }
  fs.readdirSync(dir).filter(f => f.endsWith(".tgz")).forEach(f => fs.unlinkSync(`${dir}/${f}`))
  await $`bun pm pack`.cwd(dir)
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(dir)
}

const binaries: { dir: string; name: string; version: string }[] = []
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const normalized = filepath.replaceAll("\\", "/")
  const p = await Bun.file(`./dist/${normalized}`).json()
  binaries.push({ dir: `./dist/${normalized.replace("/package.json", "")}`, name: p.name, version: p.version })
}
console.log("binaries", Object.fromEntries(binaries.map((b) => [b.name, b.version])))
const version = binaries[0].version

fs.rmSync(`./dist/${pkg.name}`, { recursive: true, force: true })
fs.mkdirSync(`./dist/${pkg.name}`, { recursive: true })
fs.cpSync(`./bin`, `./dist/${pkg.name}/bin`, { recursive: true })
  fs.copyFileSync("./script/postinstall.mjs", `./dist/${pkg.name}/postinstall.mjs`)
await Bun.file(`./dist/${pkg.name}/LICENSE`).write(await Bun.file("../../LICENSE").text())
await Bun.file(`./dist/${pkg.name}/README.md`).write(await Bun.file("../../README_npm.md").text())

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      version: version,
      description: "OctoCode - AI-powered development tool by Farhan Dhrubo",
      license: "GPL-3.0-or-later",
      author: "Farhan Dhrubo",
      homepage: "https://github.com/farhanic017/octocode",
      repository: {
        type: "git",
        url: "git+https://github.com/farhanic017/octocode.git",
      },
      bugs: {
        url: "https://github.com/farhanic017/octocode/issues",
      },
      keywords: ["ai", "cli", "code", "octocode", "agent", "coding"],
      bin: {
        octo: "./bin/octo",
      },
      scripts: {
        postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
      },
      optionalDependencies: Object.fromEntries(binaries.map((b) => [b.name, b.version])),
    },
    null,
    2,
  ),
)

const tasks = binaries.map(async (b) => {
  await publish(b.dir, b.name, b.version)
})
await Promise.all(tasks)
await publish(`./dist/${pkg.name}`, pkg.name, version)
