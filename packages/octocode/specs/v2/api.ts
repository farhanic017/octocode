// @ts-nocheck

import { OctoCode } from "@octocode-ai/core"
import { ReadTool } from "@octocode-ai/core/tools"

const octocode = OctoCode.make({})

octocode.tool.add(ReadTool)

octocode.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

octocode.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

octocode.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await octocode.session.create({
  agent: "build",
})

octocode.subscribe((event) => {
  console.log(event)
})

await octocode.session.prompt({
  sessionID,
  text: "hey what is up",
})

await octocode.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await octocode.session.wait()

console.log(await octocode.session.messages(sessionID))
