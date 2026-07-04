declare global {
  const OCTOCODE_VERSION: string
  const OCTOCODE_CHANNEL: string
}

export const InstallationVersion = typeof OCTOCODE_VERSION === "string" ? OCTOCODE_VERSION : "local"
export const InstallationChannel = typeof OCTOCODE_CHANNEL === "string" ? OCTOCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"


