const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://octocode.ai" : `https://${stage}.octocode.ai`,
  console: stage === "production" ? "https://octocode.ai/auth" : `https://${stage}.octocode.ai/auth`,
  email: "contact@anoma.ly",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/anomalyco/octocode",
  discord: "https://octocode.ai/discord",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
