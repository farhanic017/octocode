import type { Plugin, Hooks, AuthHook } from "../index.js"

const CLIENT_ID = "client_728290227fc048cc9262091a1ea197ea"

function getExpiry(expiresIn: number | null | undefined): number {
  if (expiresIn == null) {
    return Number.MAX_SAFE_INTEGER
  }
  return Date.now() + expiresIn * 1000
}

export const poeAuthPlugin: Plugin = async (_input) => {
  const authHook: AuthHook = {
    provider: "poe",
    async loader(auth) {
      const authData = await auth()
      if (!authData) return {}

      if (authData.type === "api") {
        return { apiKey: authData.key }
      }

      if (authData.type !== "oauth") {
        return {}
      }

      if (authData.expires < Date.now()) {
        throw new Error("Poe API key expired. Run `octo providers login` again.")
      }

      return { apiKey: authData.access }
    },
    methods: [
      {
        type: "oauth",
        label: "Login with Poe (browser)",
        async authorize() {
          const { createOAuthClient } = await import("poe-oauth")
          const { default: open } = await import("open")

          const client = createOAuthClient({
            clientId: CLIENT_ID,
            landingPage: {
              title: "Connected to Poe",
              body: "You can close this tab and return to OctoCode.",
            },
            openBrowser: async (url: string) => {
              await open(url)
            },
          })

          const authorization = await client.authorize()

          return {
            url: authorization.authorizationUrl,
            instructions: "Complete authorization in your browser. This window will close automatically.",
            method: "auto",
            callback: async () => {
              const result = await authorization.waitForResult()
              return {
                type: "success" as const,
                access: result.apiKey,
                refresh: result.apiKey,
                expires: getExpiry(result.expiresIn),
              }
            },
          }
        },
      },
      {
        type: "api",
        label: "Manually enter API Key",
      },
    ],
  }

  return { auth: authHook }
}
