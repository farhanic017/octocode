import defaultOpen from "open"

let extNavigate: ((url: string) => Promise<void>) | null = null

export function setGlobalNavigator(fn: (url: string) => Promise<void>) {
  extNavigate = fn
}

export default async function openUrl(url: string, opts?: any) {
  if (extNavigate) {
    await extNavigate(url).catch(() => {})
    return
  }
  return defaultOpen(url, opts)
}
