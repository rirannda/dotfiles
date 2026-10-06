import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { Variable } from "./utils/Variable";

export type WidgetType =
  | "clock"
  | "settings"
  | "workspaces"
  | "tray"
  | "sidebar"
  | "notifications"
  | "system"
  | "focused"
  | "media"
  | "battery";

export interface BarConfig {
  left: WidgetType[];
  center: WidgetType[];
  right: WidgetType[];
}

const defaultConfig: BarConfig = {
  left: ["clock", "settings", "focused", "media"],
  center: ["workspaces"],
  right: ["tray", "sidebar", "system", "battery"],
};

const CONFIG_PATH = `${GLib.get_user_data_dir()}/ags/bar-layout.json`;

export function loadBarConfig(): BarConfig {
  try {
    const file = Gio.File.new_for_path(CONFIG_PATH);
    if (!file.query_exists(null)) return defaultConfig;
    const [, contents] = file.load_contents(null);
    const config = JSON.parse(new TextDecoder().decode(contents)) as BarConfig;
    // Preserve saved positions while adding the new widget to existing layouts.
    if (![...config.left, ...config.center, ...config.right].includes("system")) {
      const battery = config.right.indexOf("battery");
      config.right.splice(battery < 0 ? config.right.length : battery, 0, "system");
    }
    for (const widget of ["focused", "media"] as WidgetType[]) {
      if (![...config.left, ...config.center, ...config.right].includes(widget)) config.left.push(widget);
    }
    return config;
  } catch (e) {
    console.error("Failed to load bar config:", e);
    return defaultConfig;
  }
}
export const barConfig = new Variable<BarConfig>(loadBarConfig());
export const editMode = new Variable<boolean>(false);

export function toggleEditMode(): void {
  editMode.set(!editMode.get());
}

export function saveBarConfig(config: BarConfig): void {
  barConfig.set(config);
  try {
    GLib.mkdir_with_parents(GLib.path_get_dirname(CONFIG_PATH), 0o755);
    const file = Gio.File.new_for_path(CONFIG_PATH);
    const bytes = new TextEncoder().encode(JSON.stringify(config, null, 2));
    file.replace_contents(
      bytes,
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null,
    );
  } catch (e) {
    console.error("Failed to save bar config:", e);
  }
}
