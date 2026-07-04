import type { ElectronAPI } from "../preload/types"

declare global {
  interface Window {
    api: ElectronAPI
    __OCTOCODE__?: {
      deepLinks?: string[]
    }
  }
}
