interface ImportMetaEnv {
  readonly OCTOCODE_CHANNEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "virtual:octocode-server" {
  export namespace Server {
    export const listen: typeof import("../../../octocode/dist/types/src/node").Server.listen
    export type Listener = import("../../../octocode/dist/types/src/node").Server.Listener
  }
  export namespace Config {
    export const get: typeof import("../../../octocode/dist/types/src/node").Config.get
    export type Info = import("../../../octocode/dist/types/src/node").Config.Info
  }
  export namespace Log {
    export const init: typeof import("../../../octocode/dist/types/src/node").Log.init
  }
  export const bootstrap: typeof import("../../../octocode/dist/types/src/node").bootstrap
}
