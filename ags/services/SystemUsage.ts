import Gio from "gi://Gio";
import GLib from "gi://GLib";

export interface Usage {
  cpu: number | null;
  memory: { used: number; total: number; percent: number } | null;
}
type CpuTime = { total: number; idle: number };
const decoder = new TextDecoder();
function read(path: string): string | null {
  try {
    const [, bytes] = Gio.File.new_for_path(path).load_contents(null);
    return decoder.decode(bytes).trim();
  } catch { return null; }
}
function number(path: string): number | null {
  const value = read(path);
  if (!value) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
function children(path: string): string[] {
  try {
    const enumerator = Gio.File.new_for_path(path).enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null);
    const names: string[] = [];
    try {
      let info: Gio.FileInfo | null;
      while ((info = enumerator.next_file(null))) names.push(info.get_name());
    } finally { enumerator.close(null); }
    return names.sort();
  } catch { return []; }
}
function cpuTime(): CpuTime | null {
  const values = read("/proc/stat")?.split("\n")[0].trim().split(/\s+/).slice(1, 9).map(Number);
  if (!values || values.length < 4 || values.some(v => !Number.isFinite(v))) return null;
  // Guest time is already included in user/nice. Idle includes iowait.
  return { total: values.reduce((a, b) => a + b, 0), idle: values[3] + (values[4] || 0) };
}
export class UsageReader {
  private previous = cpuTime();
  sample(): Usage {
    const current = cpuTime();
    const delta = current && this.previous ? current.total - this.previous.total : 0;
    const cpu = current && this.previous && delta > 0
      ? Math.max(0, Math.min(100, 100 * (1 - (current.idle - this.previous.idle) / delta))) : null;
    this.previous = current;
    const text = read("/proc/meminfo");
    const total = Number(text?.match(/^MemTotal:\s+(\d+)/m)?.[1]) * 1024;
    const available = Number(text?.match(/^MemAvailable:\s+(\d+)/m)?.[1]) * 1024;
    const memory = total > 0 && Number.isFinite(available)
      ? { used: total - available, total, percent: 100 * (total - available) / total } : null;
    return { cpu, memory };
  }
}
export function bytes(value: number): string {
  return `${(value / 1024 ** 3).toFixed(1)} GiB`;
}
export function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}

const listeners = new Set<(usage: Usage) => void>();
let barReader: UsageReader | null = null;
let barTimer = 0;
let current: Usage = { cpu: null, memory: null };
let barSamples = 0;
let detailWatchers = 0;
let detailSamples = 0;
let gpuQueries = 0;
export function systemUsageStatus() {
  return { barIntervalSeconds: 10, barTimerActive: !!barTimer, barListeners: listeners.size,
    barSamples, detailWatchers, detailSamples, gpuQueries };
}
export function watchBarUsage(callback: (usage: Usage) => void): () => void {
  listeners.add(callback);
  if (!barTimer) {
    barReader = new UsageReader();
    current = barReader.sample();
    current.cpu = null; // Wait for the first full ten-second measurement window.
    barTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
      current = barReader!.sample();
      barSamples++;
      listeners.forEach(listener => listener(current));
      return GLib.SOURCE_CONTINUE;
    });
  }
  callback(current);
  return () => {
    listeners.delete(callback);
    if (!listeners.size && barTimer) {
      GLib.source_remove(barTimer); barTimer = 0; barReader = null;
    }
  };
}

export interface GpuUsage { name: string; usage: number | null; temperature: number | null; state: string }
export interface DiskUsage { path: string; used: number; total: number }
export interface Details extends Usage { temperature: number | null; gpus: GpuUsage[]; disks: DiskUsage[] }
interface Gpu { path: string; vendor: string; name: string; temperaturePath?: string }
function temperaturePaths(path: string): string[] {
  return children(path).filter(name => /^temp\d+_input$/.test(name)).map(name => `${path}/${name}`);
}
function cpuTemperaturePaths(): string[] {
  return children("/sys/class/hwmon").flatMap(name => {
    const path = `/sys/class/hwmon/${name}`;
    return ["k10temp", "coretemp", "zenpower"].includes(read(`${path}/name`) || "") ? temperaturePaths(path) : [];
  });
}
function discoverGpus(): Gpu[] {
  return children("/sys/class/drm").filter(name => /^card\d+$/.test(name)).map(name => {
    const path = `/sys/class/drm/${name}/device`;
    const vendor = read(`${path}/vendor`) || "";
    const hwmon = children(`${path}/hwmon`)[0];
    return { path, vendor, name: `${vendor === "0x10de" ? "NVIDIA" : vendor === "0x1002" ? "AMD" : vendor === "0x8086" ? "Intel" : "GPU"} (${name})`,
      temperaturePath: hwmon ? temperaturePaths(`${path}/hwmon/${hwmon}`)[0] : undefined };
  });
}
function disks(): DiskUsage[] {
  const paths = [...new Set(["/", GLib.get_home_dir()])];
  const seen = new Set<string>();
  const result: DiskUsage[] = [];
  for (const path of paths) {
    try {
      const file = Gio.File.new_for_path(path);
      const id = file.query_info("id::filesystem", Gio.FileQueryInfoFlags.NONE, null).get_attribute_string("id::filesystem");
      if (id && seen.has(id)) continue;
      const info = file.query_filesystem_info("filesystem::size,filesystem::free", null);
      const total = info.get_attribute_uint64("filesystem::size");
      const free = info.get_attribute_uint64("filesystem::free");
      if (total > 0) result.push({ path, total, used: total - free });
      if (id) seen.add(id);
    } catch { /* Unavailable filesystem metrics are shown as unavailable. */ }
  }
  return result;
}

// Constructed only when the panel opens; no hardware discovery runs on import.
export class DetailMonitor {
  private reader = new UsageReader();
  private temperatures = cpuTemperaturePaths();
  private gpus = discoverGpus();
  private diskValues = disks();
  private timer = 0;
  private disposed = false;
  private process: Gio.Subprocess | null = null;
  private queryTimeout = 0;
  private cancellable = new Gio.Cancellable();
  private lastDisk = GLib.get_monotonic_time();
  private value: Details = { ...current, temperature: null, gpus: [], disks: this.diskValues };

  constructor(private callback: (value: Details) => void) {
    detailWatchers++;
    this.update(true);
    this.timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
      this.update(false); return GLib.SOURCE_CONTINUE;
    });
  }
  private update(initial: boolean) {
    if (this.disposed) return;
    detailSamples++;
    const usage = this.reader.sample();
    if (initial) usage.cpu = current.cpu;
    const temps = this.temperatures.map(number).filter((t): t is number => t !== null);
    if (GLib.get_monotonic_time() - this.lastDisk >= 30_000_000) {
      this.diskValues = disks(); this.lastDisk = GLib.get_monotonic_time();
    }
    const gpus = this.gpus.map(gpu => {
      // Check power state before reading device sensors or launching nvidia-smi.
      const state = read(`${gpu.path}/power/runtime_status`);
      if (state === "suspended" || state === "suspending") return { name: gpu.name, usage: null, temperature: null, state: "Sleeping" };
      const previous = this.value.gpus.find(value => value.name === gpu.name);
      if (gpu.vendor === "0x10de") return previous?.state === "Sleeping"
        ? { name: gpu.name, usage: null, temperature: null, state: "Loading" }
        : previous || { name: gpu.name, usage: null, temperature: null, state: "Loading" };
      const temp = gpu.temperaturePath ? number(gpu.temperaturePath) : null;
      return { name: gpu.name, usage: number(`${gpu.path}/gpu_busy_percent`), temperature: temp === null ? null : temp / 1000, state: "" };
    });
    this.value = { ...usage, temperature: temps.length ? Math.max(...temps) / 1000 : null, gpus, disks: this.diskValues };
    this.callback(this.value);
    const activeNvidia = this.gpus.filter(gpu => gpu.vendor === "0x10de" && this.value.gpus.find(item => item.name === gpu.name)?.state !== "Sleeping");
    if (activeNvidia.length && !this.process) this.queryNvidia(activeNvidia);
  }
  private queryNvidia(active: Gpu[]) {
    if (!GLib.find_program_in_path("nvidia-smi")) {
      this.value.gpus.filter(gpu => active.some(item => item.name === gpu.name)).forEach(gpu => gpu.state = "Unavailable");
      this.callback(this.value); return;
    }
    try {
      // Query only active PCI devices, so another suspended GPU stays asleep.
      const pciIds = active.map(gpu => read(`${gpu.path}/uevent`)?.match(/^PCI_SLOT_NAME=(.+)$/m)?.[1]).filter(Boolean);
      if (pciIds.length !== active.length) throw new Error("Missing PCI identity");
      const process = Gio.Subprocess.new(["nvidia-smi", `--id=${pciIds.join(",")}`,
        "--query-gpu=pci.bus_id,utilization.gpu,temperature.gpu", "--format=csv,noheader,nounits"],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
      this.process = process;
      gpuQueries++;
      this.queryTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
        this.queryTimeout = 0; process.force_exit(); return GLib.SOURCE_REMOVE;
      });
      process.communicate_utf8_async(null, this.cancellable, (_process, result) => {
        try {
          const [, output] = process.communicate_utf8_finish(result);
          if (this.disposed) return;
          if (!process.get_successful()) throw new Error("GPU query failed");
          for (const line of (output || "").trim().split("\n")) {
            const [pci, usage, temp] = line.split(",").map(v => v.trim());
            const index = pciIds.findIndex(id => pci.toLowerCase().endsWith(String(id).toLowerCase().slice(-7)));
            if (index < 0) continue;
            const gpu = this.value.gpus.find(item => item.name === active[index].name)!;
            gpu.usage = /^\d+(\.\d+)?$/.test(usage) ? Number(usage) : null;
            gpu.temperature = /^\d+(\.\d+)?$/.test(temp) ? Number(temp) : null;
            gpu.state = "";
          }
          this.callback(this.value);
        } catch {
          if (!this.disposed) {
            this.value.gpus.filter(gpu => active.some(item => item.name === gpu.name)).forEach(gpu => gpu.state = "Unavailable");
            this.callback(this.value);
          }
        } finally {
          if (this.queryTimeout) GLib.source_remove(this.queryTimeout);
          this.queryTimeout = 0; this.process = null;
        }
      });
    } catch {
      this.value.gpus.filter(gpu => active.some(item => item.name === gpu.name)).forEach(gpu => gpu.state = "Unavailable");
      this.callback(this.value);
    }
  }
  stop() {
    if (this.disposed) return;
    this.disposed = true;
    detailWatchers--;
    if (this.timer) GLib.source_remove(this.timer);
    this.timer = 0;
    this.cancellable.cancel();
    if (this.queryTimeout) GLib.source_remove(this.queryTimeout);
    this.queryTimeout = 0;
    this.process?.force_exit();
  }
}
