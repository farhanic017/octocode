export * from "./client.js"
export * from "./server.js"

import { createOctocodeClient } from "./client.js"
import { createOctocodeServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export * as data from "./data.js"

export async function createOctocode(options?: ServerOptions) {
  const server = await createOctocodeServer({
    ...options,
  })

  const client = createOctocodeClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}


