import Gio from "gi://Gio";
import GLib from "gi://GLib";

export interface ClipboardEntry {
  id: string;
  text: string;
  isImage: boolean;
}

export const clipboardDatabase = GLib.getenv("AGS_CLIPHIST_DB") ||
  GLib.build_filenamev([GLib.get_user_cache_dir(), "cliphist", "db"]);

export function parseClipboardHistory(output: string): ClipboardEntry[] {
  return output.split("\n").flatMap((line) => {
    const separator = line.indexOf("\t");
    const id = line.slice(0, separator);
    if (separator < 1 || !/^\d+$/.test(id)) return [];
    const text = line.slice(separator + 1);
    return [{ id, text, isImage: /^\[\[ binary data .*\b(?:png|jpe?g|webp|gif|bmp|tiff?|svg)\b/i.test(text) }];
  });
}

// communicate_async preserves bytes, including image data and text newlines.
// No history contents are interpolated into a shell command.
export function clipboardCommand(argv: string[], input: GLib.Bytes | null = null, capture = true): Promise<GLib.Bytes> {
  return new Promise((resolve, reject) => {
    try {
      const process = Gio.Subprocess.new(argv,
        (capture ? Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
          : Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE) |
        (input === null ? Gio.SubprocessFlags.NONE : Gio.SubprocessFlags.STDIN_PIPE));
      process.communicate_async(input, null, (source, result) => {
        try {
          const [, stdout, stderr] = source!.communicate_finish(result);
          if (!source!.get_successful()) {
            const message = stderr ? new TextDecoder().decode(stderr.get_data()).trim() : "";
            throw new Error(`${argv[0]} failed: ${message || source!.get_exit_status()}`);
          }
          resolve(stdout || new GLib.Bytes(new Uint8Array()));
        } catch (error) { reject(error); }
      });
    } catch (error) { reject(error); }
  });
}

export class ClipboardHistory {
  private monitor: Gio.FileMonitor | null = null;
  private debounce = 0;

  constructor(readonly database = clipboardDatabase) {}

  private argv(command: string, ...args: string[]) {
    return ["cliphist", "-db-path", this.database, command, ...args];
  }

  async list(): Promise<ClipboardEntry[]> {
    if (!GLib.find_program_in_path("cliphist")) throw new Error("cliphist is not installed");
    if (!GLib.file_test(this.database, GLib.FileTest.EXISTS)) return [];
    const output = await clipboardCommand(this.argv("list"));
    return parseClipboardHistory(new TextDecoder().decode(output.get_data()));
  }

  decode(id: string): Promise<GLib.Bytes> {
    if (!/^\d+$/.test(id)) return Promise.reject(new Error("Invalid clipboard entry ID"));
    return clipboardCommand(this.argv("decode", id));
  }

  async copy(entry: ClipboardEntry): Promise<void> {
    const bytes = await this.decode(entry.id);
    const [type] = Gio.content_type_guess(null, bytes.get_data());
    const mime = entry.isImage ? Gio.content_type_get_mime_type(type) : "text/plain;charset=utf-8";
    // wl-copy forks a clipboard owner. Its inherited output pipes can remain
    // open until the next copy; wait for the parent without capturing those pipes.
    await clipboardCommand(["wl-copy", "--type", mime || "application/octet-stream"], bytes, false);
  }

  async remove(id: string): Promise<void> {
    if (!/^\d+$/.test(id)) throw new Error("Invalid clipboard entry ID");
    await clipboardCommand(this.argv("delete"), new GLib.Bytes(new TextEncoder().encode(`${id}\n`)));
  }

  async clear(): Promise<void> {
    await clipboardCommand(this.argv("wipe"));
  }

  watch(changed: () => void): void {
    this.stopWatching();
    const directory = GLib.path_get_dirname(this.database);
    // The existing wl-paste watchers own recording. Only watch their database.
    GLib.mkdir_with_parents(directory, 0o700);
    this.monitor = Gio.File.new_for_path(directory).monitor_directory(Gio.FileMonitorFlags.NONE, null);
    const basename = GLib.path_get_basename(this.database);
    this.monitor.connect("changed", (_monitor, file, other) => {
      if (file?.get_basename() !== basename && other?.get_basename() !== basename) return;
      if (this.debounce) GLib.source_remove(this.debounce);
      this.debounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
        this.debounce = 0;
        changed();
        return GLib.SOURCE_REMOVE;
      });
    });
  }

  stopWatching(): void {
    this.monitor?.cancel();
    this.monitor = null;
    if (this.debounce) GLib.source_remove(this.debounce);
    this.debounce = 0;
  }
}
