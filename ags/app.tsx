#!/usr/bin/env -S ags run
import { createRoot, onCleanup } from "ags";
import app from "ags/gtk4/app";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Gettext from "gettext";
import Gtk from "gi://Gtk?version=4.0";
import Hyprland from "gi://AstalHyprland";
import Bar from "./Bar";
import VolumePopup from "./Widgets/VolumePopup";
import BrightnessPopup from "./Widgets/BrightnessPopup";
import SettingsWindow from "./Widgets/Settings";
import Applauncher from "./Widgets/Applauncher";
import NotificationPopups from "./Widgets/Notificationpopup";
import Sidebar from "./Widgets/RightSidebar";
import PowerMenu from "./Widgets/PowerMenu";
import MusicPopup from "./Widgets/BottomPopup";
import Clipboard from "./Widgets/Clipboard";
import { toggleEditMode, editMode } from "./State";
import { configDir } from "./Paths";
import { restoreWallpaper, stopVideoWallpaper } from "./services/Theme";
import { brightnessStatus, startBrightnessMonitoring, stopBrightnessMonitoring } from "./services/Brightness";
import { systemUsageStatus } from "./services/SystemUsage";

const stylePath = GLib.build_filenamev([configDir, "style.css"]);
let launcherWin: Gtk.Window;
let fileMonitor: Gio.FileMonitor;
let debounceId = 0;

function focusedConnector(): string | undefined {
  const name = Hyprland.get_default().get_focused_monitor()?.get_name();
  const monitors = app.get_monitors();
  return (monitors.find((monitor) => monitor.connector === name) || monitors[0])?.connector;
}

app.start({
  instanceName: GLib.getenv("AGS_INSTANCE_NAME") || "ags-shell",
  css: stylePath,
  requestHandler(argv, res) {
    if (argv[0] === "brightness-status") return res(JSON.stringify(brightnessStatus()));
    if (argv[0] === "system-status") return res(JSON.stringify(systemUsageStatus()));
    const aliases: Record<string, string> = {
      launcher: "toggle", dashboard: "RightSidebar", notifications: "RightSidebar",
      calendar: "RightSidebar", quicksettings: "settings", media: "music-popup",
      clipboard: "clipboard",
    };
    const command = argv[0] === "toggle" && argv[1] ? aliases[argv[1]] : argv[0];
    if (command === "toggle") {
      launcherWin.visible = !launcherWin.visible;
      if (launcherWin.visible) launcherWin.present();
      return res("ok");
    }
    if (command === "toggle-edit-mode") {
      toggleEditMode();
      return res(`ok - edit mode: ${editMode.get()}`);
    }
    const names: Record<string, string> = {
      RightSidebar: "RightSidebar", settings: "settings-window",
      "toggle-powermenu": "powermenu", "music-popup": "music-popup",
      clipboard: "clipboard",
    };
    const connector = focusedConnector();
    if (command && names[command] && connector) {
      if (command === "clipboard") {
        for (const window of app.get_windows()) {
          if (window.name.startsWith("clipboard-") && window.name !== `clipboard-${connector}`) window.hide();
        }
      }
      app.toggle_window(`${names[command]}-${connector}`);
      return res("ok");
    }
    return res("unknown command or no monitor");
  },
  main() {
    // English GTK labels for this process; child applications keep their locale.
    Gettext.setlocale(Gettext.LocaleCategory.MESSAGES, "C");
    app.connect("shutdown", stopVideoWallpaper);
    void startBrightnessMonitoring();
    launcherWin = Applauncher() as Gtk.Window;
    launcherWin.visible = false;
    app.add_window(launcherWin);

    fileMonitor = Gio.File.new_for_path(configDir).monitor_directory(Gio.FileMonitorFlags.NONE, null);
    fileMonitor.connect("changed", (_monitor, file) => {
      if (!["colors.css", "style.css"].includes(file.get_basename() || "")) return;
      if (debounceId) GLib.source_remove(debounceId);
      debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
        app.apply_css(stylePath, true);
        debounceId = 0;
        return GLib.SOURCE_REMOVE;
      });
    });
    void restoreWallpaper().catch(console.error);

    // Notification windows associate themselves with app and manage monitors.
    NotificationPopups();
    // Each monitor gets its own scope. Keep Gtk.Application out of For fragments:
    // it is the owner of the windows rather than a rendered fragment child.
    const groups = new Map<any, { windows: Gtk.Window[]; dispose: () => void }>();
    const removeGroup = (monitor: any) => {
      const group = groups.get(monitor);
      if (!group) return;
      group.windows.forEach((window) => window.destroy());
      group.dispose();
      groups.delete(monitor);
    };
    const syncMonitors = () => {
      const monitors = app.get_monitors();
      for (const monitor of groups.keys()) {
        if (!monitors.includes(monitor)) removeGroup(monitor);
      }
      for (const gdkmonitor of monitors) {
        if (groups.has(gdkmonitor)) continue;
        groups.set(gdkmonitor, createRoot((dispose) => {
          const components = [Bar, SettingsWindow, VolumePopup, BrightnessPopup,
            Sidebar, PowerMenu, MusicPopup, Clipboard];
          const windows = components.map((component) => component({ gdkmonitor }))
            .filter((window): window is Gtk.Window => window instanceof Gtk.Window);
          windows.forEach((window) => app.add_window(window));
          return { windows, dispose };
        }));
      }
    };
    syncMonitors();
    const monitorSignal = app.connect("notify::monitors", syncMonitors);
    onCleanup(() => {
      stopBrightnessMonitoring();
      app.disconnect(monitorSignal);
      for (const monitor of groups.keys()) removeGroup(monitor);
      fileMonitor.cancel();
      if (debounceId) GLib.source_remove(debounceId);
    });
  },
});
