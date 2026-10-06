import GLib from "gi://GLib";
import { Variable } from "../utils/Variable";
import { dataDir, cacheDir } from "../Paths";

const savePath = GLib.build_filenamev([dataDir, "settings.json"]);
const legacyPath = GLib.build_filenamev([cacheDir, "settings.json"]);
let settings: Record<string, unknown> = {};
for (const path of [savePath, legacyPath]) {
  try {
    const [ok, content] = GLib.file_get_contents(path);
    if (ok) {
      settings = JSON.parse(new TextDecoder().decode(content));
      break;
    }
  } catch (_) {}
}

export function loadSavedValue<T>(key: string, fallback: T): T {
  return (settings[key] ?? fallback) as T;
}

export function saveToDisk(key: string, value: unknown): void {
  settings[key] = value;
  GLib.mkdir_with_parents(dataDir, 0o755);
  GLib.file_set_contents(savePath, JSON.stringify(settings, null, 2));
}

const initialCount = Number(loadSavedValue("workspaceCount", 10));
export const workspaceCount = new Variable(
  Number.isInteger(initialCount) && initialCount >= 1 && initialCount <= 10 ? initialCount : 10,
);
export function setWorkspaceCount(value: number): void {
  if (Number.isInteger(value) && value >= 1 && value <= 10) {
    workspaceCount.set(value);
    saveToDisk("workspaceCount", value);
  }
}
export const notificationTimeout = new Variable(loadSavedValue("notificationTimeout", 5000));
export const maxVolume = new Variable(loadSavedValue("maxVolume", 1.0));
