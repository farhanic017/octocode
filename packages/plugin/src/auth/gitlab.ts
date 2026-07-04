import type { Plugin, Hooks, AuthHook } from "../index.js"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import os from "os"
import http from "http"

const BUNDLED_CLIENT_ID =
  process.env.GITLAB_OAUTH_CLIENT_ID ||
  "1d89f9fdb23ee96d4e603201f6861dab6e143c5c3c00469a018a2d94bdc03d4e"
const GITLAB_COM_URL = "https://gitlab.com"
const OAUTH_SCOPES = ["api"]

function resolveInstanceUrl(): string {
  return process.env.GITLAB_INSTANCE_URL || GITLAB_COM_URL
}

function getAuthPath(): string {
  const homeDir = os.homedir()
  const xdgDataHome = process.env.XDG_DATA_HOME
  if (xdgDataHome) {
    return path.join(xdgDataHome, "octo", "auth.json")
  }
  if (process.platform !== "win32") {
    return path.join(homeDir, ".local", "share", "octo", "auth.json")
  }
  return path.join(homeDir, ".octo", "auth.json")
}

function saveOAuthData(access: string, refresh: string, expires: number, enterpriseUrl: string): void {
  const authPath = getAuthPath()
  const authDir = path.dirname(authPath)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }
  let authData: Record<string, any> = {}
  if (fs.existsSync(authPath)) {
    authData = JSON.parse(fs.readFileSync(authPath, "utf-8"))
  }
  authData.gitlab = { type: "oauth", access, refresh, expires, enterpriseUrl }
  fs.writeFileSync(authPath, JSON.stringify(authData, null, 2))
  fs.chmodSync(authPath, 0o600)
}

function savePATData(key: string, enterpriseUrl: string): void {
  const authPath = getAuthPath()
  const authDir = path.dirname(authPath)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }
  let authData: Record<string, any> = {}
  if (fs.existsSync(authPath)) {
    authData = JSON.parse(fs.readFileSync(authPath, "utf-8"))
  }
  authData.gitlab = { type: "api", key, enterpriseUrl }
  fs.writeFileSync(authPath, JSON.stringify(authData, null, 2))
  fs.chmodSync(authPath, 0o600)
}

function generateSecret(length = 43): string {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

function generateCodeChallengeFromVerifier(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest()
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

type CallbackResult = { code: string; state: string }

function createCallbackServer(
  port: number,
): Promise<{ server: http.Server; url: string; waitForCallback: () => Promise<CallbackResult> }> {
  return new Promise((resolve, reject) => {
    let resolveCallback: ((result: CallbackResult) => void) | undefined
    let rejectCallback: ((error: Error) => void) | undefined

    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`)
      const code = url.searchParams.get("code")
      const state = url.searchParams.get("state")
      const error = url.searchParams.get("error")
      const errorDescription = url.searchParams.get("error_description")

      if (error) {
        const msg = errorDescription || error
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(`<html><body><h1>Authentication Failed</h1><p>${msg}</p><p>You can close this window.</p></body></html>`)
        rejectCallback?.(new Error(`OAuth error: ${msg}`))
        return
      }

      if (!code || !state) {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(`<html><body><h1>Authentication Failed</h1><p>Missing parameters.</p></body></html>`)
        rejectCallback?.(new Error("Missing code or state parameter"))
        return
      }

      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(
        `<html><body><h1>Authentication Successful</h1><p>You can close this window and return to your terminal.</p></body></html>`,
      )
      resolveCallback?.({ code, state })
    })

    server.listen(port, "127.0.0.1", () => {
      const addr = server.address()
      if (!addr || typeof addr === "string") {
        reject(new Error("Server not started"))
        return
      }
      resolve({
        server,
        url: `http://127.0.0.1:${addr.port}/callback`,
        waitForCallback: () =>
          new Promise<CallbackResult>((res, rej) => {
            resolveCallback = res
            rejectCallback = rej
          }),
      })
    })

    server.on("error", reject)
  })
}

let refreshInProgress: Promise<any> | null = null

async function refreshTokenIfNeeded(
  authData: any,
  auth: () => Promise<any>,
  fallbackUrl: string,
): Promise<{ apiKey: string; instanceUrl: string }> {
  const now = Date.now()
  const expiryBuffer = 5 * 60 * 1000
  const isExpired = authData.expires <= now + expiryBuffer

  if (!isExpired) {
    return { apiKey: authData.access, instanceUrl: authData.enterpriseUrl || fallbackUrl }
  }

  if (refreshInProgress) {
    await refreshInProgress
    const refreshedAuthData = await auth()
    if (refreshedAuthData && refreshedAuthData.type === "oauth") {
      return { apiKey: refreshedAuthData.access, instanceUrl: refreshedAuthData.enterpriseUrl || fallbackUrl }
    }
    throw new Error("Failed to get refreshed auth data")
  }

  refreshInProgress = (async () => {
    try {
      const instanceUrl = authData.enterpriseUrl || fallbackUrl
      const tokenUrl = `${instanceUrl}/oauth/token`
      const params = new URLSearchParams({
        client_id: BUNDLED_CLIENT_ID,
        refresh_token: authData.refresh,
        grant_type: "refresh_token",
      })
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: params.toString(),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
      const tokens = await response.json()
      const newExpiry = Date.now() + tokens.expires_in * 1000
      saveOAuthData(tokens.access_token, tokens.refresh_token, newExpiry, instanceUrl)
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        const authPath = getAuthPath()
        if (fs.existsSync(authPath)) {
          const content = fs.readFileSync(authPath, "utf-8")
          const authDataFile = JSON.parse(content)
          delete authDataFile.gitlab
          fs.writeFileSync(authPath, JSON.stringify(authDataFile, null, 2))
        }
      }
      throw error
    }
  })()

  try {
    await refreshInProgress
  } finally {
    refreshInProgress = null
  }

  const refreshedAuthData = await auth()
  if (refreshedAuthData && refreshedAuthData.type === "oauth") {
    return { apiKey: refreshedAuthData.access, instanceUrl: refreshedAuthData.enterpriseUrl || fallbackUrl }
  }
  throw new Error("Failed to get refreshed auth data after token refresh")
}

export const gitlabAuthPlugin: Plugin = async (_input) => {
  const authHook: AuthHook = {
    provider: "gitlab",
    async loader(auth) {
      const authData = await auth()
      if (!authData) return {}

      if (authData.type === "oauth") {
        try {
          const result = await refreshTokenIfNeeded(authData, auth, resolveInstanceUrl())
          return { ...result, clientId: BUNDLED_CLIENT_ID }
        } catch {
          return {
            apiKey: authData.access,
            instanceUrl: authData.enterpriseUrl || resolveInstanceUrl(),
            clientId: BUNDLED_CLIENT_ID,
          }
        }
      }

      if (authData.type === "api") {
        const enterpriseUrl = (authData as any).enterpriseUrl
        return { apiKey: authData.key, instanceUrl: enterpriseUrl || resolveInstanceUrl() }
      }

      return {}
    },
    methods: [
      {
        type: "oauth",
        label: "GitLab OAuth",
        prompts: [],
        async authorize() {
          const instanceUrl = resolveInstanceUrl()
          let normalizedUrl: string
          try {
            const url = new URL(instanceUrl)
            normalizedUrl = `${url.protocol}//${url.host}`
          } catch {
            throw new Error(`Invalid GitLab instance URL: ${instanceUrl}`)
          }

          const codeVerifier = generateSecret(43)
          const codeChallenge = generateCodeChallengeFromVerifier(codeVerifier)
          const state = generateSecret(32)

          const { server, url: callbackUrl, waitForCallback } = await createCallbackServer(8080)
          const callbackPromise = waitForCallback()

          const params = new URLSearchParams({
            client_id: BUNDLED_CLIENT_ID,
            redirect_uri: callbackUrl,
            response_type: "code",
            state,
            scope: OAUTH_SCOPES.join(" "),
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
          })
          const authUrl = `${normalizedUrl}/oauth/authorize?${params.toString()}`

          const platform = process.platform
          const openCommand = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open"
          const { exec } = await import("child_process")
          exec(`${openCommand} "${authUrl}"`)

          return {
            method: "auto",
            url: authUrl,
            instructions: "Your browser will open for authentication. The callback will be handled automatically.",
            async callback() {
              try {
                const result = await callbackPromise
                if (result.state !== state) {
                  server.close()
                  return { type: "failed" as const }
                }

                const tokenUrl = `${normalizedUrl}/oauth/token`
                const tokenParams = new URLSearchParams({
                  client_id: BUNDLED_CLIENT_ID,
                  code: result.code,
                  grant_type: "authorization_code",
                  redirect_uri: callbackUrl,
                  code_verifier: codeVerifier,
                })
                const response = await fetch(tokenUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
                  body: tokenParams.toString(),
                })
                if (!response.ok) {
                  const errorText = await response.text()
                  throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`)
                }
                const tokens = await response.json()

                server.close()
                const expiresAt = Date.now() + tokens.expires_in * 1000
                saveOAuthData(tokens.access_token, tokens.refresh_token, expiresAt, normalizedUrl)

                return {
                  type: "success" as const,
                  provider: normalizedUrl,
                  access: tokens.access_token,
                  refresh: tokens.refresh_token,
                  expires: expiresAt,
                }
              } catch {
                try {
                  server.close()
                } catch {}
                return { type: "failed" as const }
              }
            },
          }
        },
      },
      {
        type: "api",
        label: "GitLab Personal Access Token",
        prompts: [
          {
            type: "text",
            key: "token",
            message: "Personal Access Token",
            placeholder: "glpat-xxxxxxxxxxxxxxxxxxxx",
            validate: (value: string) => {
              if (!value) return "Token is required"
              if (!value.startsWith("glpat-")) return "Token should start with glpat-"
              return undefined
            },
          },
        ],
        async authorize(inputs) {
          const instanceUrl = resolveInstanceUrl()
          const token = inputs?.token
          if (!token) return { type: "failed" as const }

          let normalizedUrl: string
          try {
            const url = new URL(instanceUrl)
            normalizedUrl = `${url.protocol}//${url.host}`
          } catch {
            return { type: "failed" as const }
          }

          try {
            const response = await fetch(`${normalizedUrl}/api/v4/user`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) return { type: "failed" as const }

            savePATData(token, normalizedUrl)
            return { type: "success" as const, key: token, provider: normalizedUrl }
          } catch {
            return { type: "failed" as const }
          }
        },
      },
    ],
  }

  return { auth: authHook }
}
