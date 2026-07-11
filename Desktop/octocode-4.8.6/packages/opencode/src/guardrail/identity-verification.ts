// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
import { Context, Effect, Layer } from "effect"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"
import { execSync } from "child_process"

export interface CreatorIdentity {
  isCreator: boolean
  gitEmail: string | null
  gitName: string | null
  ghAuthenticated: boolean
  ghUsername: string | null
  desktopAuthenticated: boolean
  desktopUsername: string | null
  verifiedAt: number
}

export interface VerificationResult {
  isCreator: boolean
  signals: {
    gitConfig: boolean
    githubCLI: boolean
    githubDesktop: boolean
  }
}

export interface IdentityVerificationInterface {
  readonly verify: () => Effect.Effect<VerificationResult>
  readonly isCreator: () => boolean
  readonly getIdentity: () => CreatorIdentity | null
  readonly ensureVerified: () => Effect.Effect<CreatorIdentity>
}

export class IdentityVerification extends Context.Service<IdentityVerification, IdentityVerificationInterface>()("@octocode/IdentityVerification") {}

const CREATOR_GIT_EMAIL = "farhanic017@gmail.com"
const CREATOR_GIT_NAME = "Farhan"
const CREATOR_GH_USERNAME = "farhanic017"

let cachedIdentity: CreatorIdentity | null = null

async function readGitConfig(): Promise<{ email: string | null; name: string | null }> {
  try {
    const configPath = path.join(os.homedir(), ".gitconfig")
    const content = await fs.readFile(configPath, "utf-8")
    const emailMatch = content.match(/email\s*=\s*(.+)/i)
    const nameMatch = content.match(/name\s*=\s*(.+)/i)
    return {
      email: emailMatch?.[1]?.trim() || null,
      name: nameMatch?.[1]?.trim() || null
    }
  } catch {
    return { email: null, name: null }
  }
}

async function checkGitHubCLI(): Promise<{ authenticated: boolean; username: string | null }> {
  try {
    const result = execSync("gh auth status", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"]
    })
    const usernameMatch = result.match(/Logged in to github\.com as (\S+)/i)
    return { authenticated: true, username: usernameMatch?.[1] || null }
  } catch {
    return { authenticated: false, username: null }
  }
}

async function checkGitHubDesktop(): Promise<{ authenticated: boolean; username: string | null }> {
  try {
    const desktopPath = process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Local", "GitHub Desktop")
      : process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support", "GitHub Desktop")
        : path.join(os.homedir(), ".config", "GitHub Desktop")
    const configPath = path.join(desktopPath, "config.json")
    const content = await fs.readFile(configPath, "utf-8")
    const config = JSON.parse(content)
    return {
      authenticated: !!config?.gitHub?.token,
      username: config?.gitHub?.login || null
    }
  } catch {
    return { authenticated: false, username: null }
  }
}

function createIdentityVerification(): IdentityVerificationInterface {
  return {
    verify: () =>
      Effect.tryPromise(async () => {
        const [gitConfig, ghCLI, ghDesktop] = await Promise.all([
          readGitConfig(),
          checkGitHubCLI(),
          checkGitHubDesktop()
        ])

        const gitConfigMatch = gitConfig.email === CREATOR_GIT_EMAIL && gitConfig.name === CREATOR_GIT_NAME
        const ghCLIMatch = ghCLI.authenticated && ghCLI.username === CREATOR_GH_USERNAME
        const ghDesktopMatch = ghDesktop.authenticated && ghDesktop.username === CREATOR_GH_USERNAME
        const isCreator = gitConfigMatch && ghCLIMatch && ghDesktopMatch

        cachedIdentity = {
          isCreator,
          gitEmail: gitConfig.email,
          gitName: gitConfig.name,
          ghAuthenticated: ghCLI.authenticated,
          ghUsername: ghCLI.username,
          desktopAuthenticated: ghDesktop.authenticated,
          desktopUsername: ghDesktop.username,
          verifiedAt: Date.now()
        }

        return {
          isCreator,
          signals: {
            gitConfig: gitConfigMatch,
            githubCLI: ghCLIMatch,
            githubDesktop: ghDesktopMatch
          }
        }
      }).pipe(Effect.catchDefect(() =>
        Effect.succeed({
          isCreator: false,
          signals: { gitConfig: false, githubCLI: false, githubDesktop: false }
        })
      )) as any,

    isCreator: () => cachedIdentity?.isCreator ?? false,

    getIdentity: () => cachedIdentity,

    ensureVerified: () =>
      Effect.gen(function* () {
        if (!cachedIdentity) {
          const result = yield* Effect.tryPromise(async () => {
            const [gitConfig, ghCLI, ghDesktop] = await Promise.all([
              readGitConfig(),
              checkGitHubCLI(),
              checkGitHubDesktop()
            ])
            const gitConfigMatch = gitConfig.email === CREATOR_GIT_EMAIL && gitConfig.name === CREATOR_GIT_NAME
            const ghCLIMatch = ghCLI.authenticated && ghCLI.username === CREATOR_GH_USERNAME
            const ghDesktopMatch = ghDesktop.authenticated && ghDesktop.username === CREATOR_GH_USERNAME
            const isCreator = gitConfigMatch && ghCLIMatch && ghDesktopMatch
            const identity: CreatorIdentity = {
              isCreator,
              gitEmail: gitConfig.email,
              gitName: gitConfig.name,
              ghAuthenticated: ghCLI.authenticated,
              ghUsername: ghCLI.username,
              desktopAuthenticated: ghDesktop.authenticated,
              desktopUsername: ghDesktop.username,
              verifiedAt: Date.now()
            }
            cachedIdentity = identity
            return identity
          }).pipe(Effect.catchDefect(() =>
            Effect.succeed({
              isCreator: false,
              gitEmail: null,
              gitName: null,
              ghAuthenticated: false,
              ghUsername: null,
              desktopAuthenticated: false,
              desktopUsername: null,
              verifiedAt: Date.now()
            } satisfies CreatorIdentity))
          )
          return result
        }
        return cachedIdentity
      }) as any,
  }
}

export const layer = Layer.succeed(IdentityVerification, createIdentityVerification())
export const defaultLayer = layer

export async function verifyCreatorIdentity(): Promise<VerificationResult> {
  const [gitConfig, ghCLI, ghDesktop] = await Promise.all([
    readGitConfig(),
    checkGitHubCLI(),
    checkGitHubDesktop()
  ])

  const gitConfigMatch = gitConfig.email === CREATOR_GIT_EMAIL && gitConfig.name === CREATOR_GIT_NAME
  const ghCLIMatch = ghCLI.authenticated && ghCLI.username === CREATOR_GH_USERNAME
  const ghDesktopMatch = ghDesktop.authenticated && ghDesktop.username === CREATOR_GH_USERNAME
  const isCreator = gitConfigMatch && ghCLIMatch && ghDesktopMatch

  cachedIdentity = {
    isCreator,
    gitEmail: gitConfig.email,
    gitName: gitConfig.name,
    ghAuthenticated: ghCLI.authenticated,
    ghUsername: ghCLI.username,
    desktopAuthenticated: ghDesktop.authenticated,
    desktopUsername: ghDesktop.username,
    verifiedAt: Date.now()
  }

  return {
    isCreator,
    signals: {
      gitConfig: gitConfigMatch,
      githubCLI: ghCLIMatch,
      githubDesktop: ghDesktopMatch
    }
  }
}

export function isCreator(): boolean {
  return cachedIdentity?.isCreator ?? false
}
