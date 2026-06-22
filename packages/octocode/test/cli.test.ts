import { test, expect } from "bun:test"
import { spawnSync } from "child_process"

test("octo binary runs without error", () => {
  const result = spawnSync("bun", ["run", "./bin/octocode", "--help"], { encoding: "utf8" })
  expect(result.status).toBe(0)
})
