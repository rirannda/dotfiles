import { execAsync } from "ags/process"

export function run(argv: string[]) {
  return execAsync(argv).catch((error) => {
    console.error(argv.join(" "), error)
    return ""
  })
}

export function sh(command: string) {
  return run(["bash", "-lc", command])
}

export function fire(argv: string[]) {
  void run(argv)
}

export function fireSh(command: string) {
  void sh(command)
}

export function clamp(value: number, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function escapeMarkup(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}
