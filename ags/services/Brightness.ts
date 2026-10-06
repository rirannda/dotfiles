import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { execAsync } from "ags/process";
import { Variable } from "../utils/Variable";

export const brightness = new Variable(0);
let device: string | null = null;
let client: any = null;
let signalId = 0;
let timerId = 0;
let running = false;
let generation = 0;
let mode: "stopped" | "starting" | "events" | "poll" = "stopped";

function readNumber(path: string): number | null {
  try {
    const [ok, content] = GLib.file_get_contents(path);
    const value = Number(new TextDecoder().decode(content).trim());
    return ok && Number.isFinite(value) ? value : null;
  } catch (_) {
    return null;
  }
}

function findDevice(): string | null {
  try {
    const iter = Gio.File.new_for_path("/sys/class/backlight").enumerate_children(
      "standard::name", Gio.FileQueryInfoFlags.NONE, null,
    );
    try {
      return iter.next_file(null)?.get_name() || null;
    } finally {
      iter.close(null);
    }
  } catch (_) {
    return null;
  }
}

export function refreshBrightness(): void {
  if (!device) device = findDevice();
  if (!device) return;
  const base = `/sys/class/backlight/${device}`;
  const maximum = readNumber(`${base}/max_brightness`);
  // Use the driver's requested value: EC-backed actual_brightness can still
  // contain the previous hardware value when its change uevent is delivered.
  const current = readNumber(`${base}/brightness`) ?? readNumber(`${base}/actual_brightness`);
  if (maximum === null || maximum <= 0 || current === null) return;
  const value = Math.max(0, Math.min(current / maximum, 1));
  if (Math.abs(value - brightness.get()) > 0.000001) brightness.set(value);
}

export function brightnessStatus() {
  return { mode, device, value: brightness.get() };
}

function startPolling(): void {
  if (!running || timerId) return;
  mode = "poll";
  timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30_000, () => {
    refreshBrightness();
    return GLib.SOURCE_CONTINUE;
  });
  console.info("Brightness: 30-second fallback polling (direct sysfs reads)");
}

export async function startBrightnessMonitoring(): Promise<void> {
  if (running) return;
  running = true;
  mode = "starting";
  const token = ++generation;
  device = findDevice();
  refreshBrightness();
  // Allows fallback on drivers that do not emit backlight events as well as
  // environments without the optional GUdev typelib.
  if (GLib.getenv("AGS_BRIGHTNESS_POLL") === "1") {
    startPolling();
    return;
  }
  try {
    const { default: GUdev } = await import("gi://GUdev?version=1.0");
    if (!running || token !== generation) return;
    client = new GUdev.Client({ subsystems: ["backlight"] });
    signalId = client.connect("uevent", (_client: any, action: string, changed: any) => {
      if (action === "add" || action === "remove") device = findDevice();
      if (!device || changed.get_name() === device) refreshBrightness();
    });
    mode = "events";
    // Synchronize changes that happened while the optional GI module was loading.
    refreshBrightness();
    console.info("Brightness: backlight uevents (no periodic polling)");
  } catch (error) {
    if (!running || token !== generation) return;
    console.warn(`Brightness event monitor unavailable: ${error}`);
    startPolling();
  }
}

export function stopBrightnessMonitoring(): void {
  running = false;
  generation++;
  if (timerId) GLib.source_remove(timerId);
  timerId = 0;
  if (client && signalId) client.disconnect(signalId);
  signalId = 0;
  client = null;
  mode = "stopped";
}

export async function setBrightness(value: number): Promise<void> {
  if (!Number.isFinite(value)) return;
  if (!device) device = findDevice();
  if (!device) throw new Error("No backlight device available");
  await execAsync(["brightnessctl", "--device", device, "set", `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`]);
  // Update immediately after our own write even when fallback polling is used.
  refreshBrightness();
}
