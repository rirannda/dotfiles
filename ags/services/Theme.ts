import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { execAsync } from "ags/process";
import { matugenConfig, defaultWallpaper, cacheDir, configRoot } from "../Paths";
import { loadSavedValue, saveToDisk } from "./Preferences";

const schemes = new Set([
  "scheme-content", "scheme-expressive", "scheme-fidelity", "scheme-fruit-salad",
  "scheme-monochrome", "scheme-neutral", "scheme-rainbow", "scheme-tonal-spot", "scheme-vibrant",
]);
const savedScheme = loadSavedValue("tonalSpot", "scheme-tonal-spot");
export const matugenState = {
  currentTonalSpot: schemes.has(savedScheme) ? savedScheme : "scheme-tonal-spot",
  lastWallpaperPath: loadSavedValue("lastWallpaperPath", ""),
};
let videoProcess: Gio.Subprocess | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function stopVideoWallpaper(): void {
  videoProcess?.force_exit();
  videoProcess = null;
}

// Serialize wallpaper and palette operations, also across multiple settings windows.
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const pending = queue.then(operation);
  queue = pending.catch(() => {});
  return pending;
}
export function thumbnailPath(path: string): string {
  const dir = GLib.build_filenamev([cacheDir, "wallpaper-thumbs"]);
  GLib.mkdir_with_parents(dir, 0o755);
  const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, path, -1);
  return GLib.build_filenamev([dir, `${hash}.jpg`]);
}
export function isVideo(path: string): boolean {
  return /\.(gif|mp4|mkv|mov|avi|webm|flv|wmv|m4v)$/i.test(path);
}
async function paletteInput(path: string): Promise<string> {
  if (!isVideo(path)) return path;
  const thumb = thumbnailPath(path);
  if (!GLib.file_test(thumb, GLib.FileTest.EXISTS)) {
    await execAsync(["ffmpeg", "-y", "-ss", "0", "-i", path, "-vframes", "1", "-vf", "scale=320:-1", thumb]);
  }
  return thumb;
}
async function generate(scheme: string, path: string): Promise<void> {
  if (!schemes.has(scheme)) throw new Error(`Unknown color scheme: ${scheme}`);
  if (!GLib.file_test(path, GLib.FileTest.IS_REGULAR)) throw new Error(`Wallpaper not found: ${path}`);
  if (!GLib.find_program_in_path("matugen")) throw new Error("matugen is not installed");
  await execAsync([
    "matugen", "--config", matugenConfig, "--mode", "dark", "--type", scheme,
    "--source-color-index", "0", "image", await paletteInput(path),
  ]);
  matugenState.currentTonalSpot = scheme;
  saveToDisk("tonalSpot", scheme);
  // Lua colors are reapplied by Hyprland's normal config reload. No portal restart.
  if (GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE")) {
    if (GLib.getenv("AGS_HYPR_THEME_MODE") === "runtime") {
      const path = GLib.build_filenamev([configRoot, "hypr", "colors", "colors.lua"]);
      const luaPath = JSON.stringify(path);
      await execAsync(["hyprctl", "eval", `local c = dofile(${luaPath}); hl.config({general={col={active_border=c.active_border,inactive_border=c.inactive_border}}})`]).catch(console.error);
    } else {
      await execAsync(["hyprctl", "reload"]).catch(console.error);
    }
  }
}
export function runMatugen(scheme: string, path = matugenState.lastWallpaperPath || defaultWallpaper): Promise<void> {
  return enqueue(() => generate(scheme, path));
}
export function applyWallpaper(path: string): Promise<void> {
  return enqueue(async () => {
    if (!GLib.file_test(path, GLib.FileTest.IS_REGULAR)) throw new Error(`Wallpaper not found: ${path}`);
    if (isVideo(path)) {
      if (!GLib.find_program_in_path("mpvpaper")) throw new Error("mpvpaper is required for GIF/video wallpapers");
      const image = await paletteInput(path);
      videoProcess?.force_exit();
      await execAsync(["awww", "clear"]);
      videoProcess = Gio.Subprocess.new(["mpvpaper", "*", path, "--mpv-options", "no-audio loop"], Gio.SubprocessFlags.NONE);
      await generate(matugenState.currentTonalSpot, image);
    } else {
      videoProcess?.force_exit();
      videoProcess = null;
      await execAsync(["awww", "img", path, "-t", "wipe", "--transition-duration", "3", "--transition-fps", "60"]);
      // Keep the selected wallpaper usable even before Matugen is installed.
      if (GLib.find_program_in_path("matugen")) await generate(matugenState.currentTonalSpot, path);
      else console.warn("matugen is missing; using the bundled palette");
    }
    matugenState.lastWallpaperPath = path;
    saveToDisk("lastWallpaperPath", path);
  });
}
export function restoreWallpaper(): Promise<void> {
  const saved = matugenState.lastWallpaperPath;
  return applyWallpaper(saved && GLib.file_test(saved, GLib.FileTest.IS_REGULAR) ? saved : defaultWallpaper);
}
