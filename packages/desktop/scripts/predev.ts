import { $ } from "bun"

await $`bun ./scripts/copy-icons.ts ${process.env.OCTOCODE_CHANNEL ?? "dev"}`

await $`cd ../octocode && bun script/build-node.ts`
