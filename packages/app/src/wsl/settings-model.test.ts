import { describe, expect, test } from "bun:test"
import { enterWslOctocodeStep, wslOctocodeAction, wslRuntimeRetryable } from "./settings-model"

describe("WSL server settings presentation", () => {
  test("retries only settled unsuccessful runtimes", () => {
    expect(wslRuntimeRetryable({ kind: "starting" })).toBe(false)
    expect(wslRuntimeRetryable({ kind: "ready", url: "http://127.0.0.1:4096", username: null, password: null })).toBe(
      false,
    )
    expect(wslRuntimeRetryable({ kind: "failed", message: "boom" })).toBe(true)
    expect(wslRuntimeRetryable({ kind: "stopped" })).toBe(true)
  })

  test("offers install and update only when OctoCode needs attention", () => {
    expect(wslOctocodeAction(undefined)).toBeUndefined()
    expect(
      wslOctocodeAction({
        distro: "Debian",
        resolvedPath: null,
        version: null,
        expectedVersion: "1.2.3",
        matchesDesktop: null,
        error: null,
      }),
    ).toBe("Install OctoCode")
    expect(
      wslOctocodeAction({
        distro: "Debian",
        resolvedPath: "/usr/local/bin/octocode",
        version: "1.2.2",
        expectedVersion: "1.2.3",
        matchesDesktop: false,
        error: null,
      }),
    ).toBe("Update OctoCode")
    expect(
      wslOctocodeAction({
        distro: "Debian",
        resolvedPath: "/usr/local/bin/octocode",
        version: "1.2.3",
        expectedVersion: "1.2.3",
        matchesDesktop: true,
        error: null,
      }),
    ).toBeUndefined()
  })

  test("probes the selected distro before entering the OctoCode step", async () => {
    const calls: string[] = []
    await enterWslOctocodeStep(
      "Debian",
      async (distro) => calls.push(distro),
      (step) => calls.push(step),
    )
    expect(calls).toEqual(["Debian", "octo"])
  })
})
