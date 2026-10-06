import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import { onCleanup } from "ags";
import { watchBarUsage, DetailMonitor, bytes, percent, type Details } from "../services/SystemUsage";

export default function SystemUsage() {
  const label = new Gtk.Label({ label: "CPU — · RAM —" });
  const button = new Gtk.Button({ child: label, css_classes: ["bar-button", "system-usage-button"],
    valign: Gtk.Align.CENTER, height_request: 24, tooltip_text: "System usage" });
  let panel: Gtk.Popover | null = null;
  let monitor: DetailMonitor | null = null;
  let releaseIdle = 0;
  let closedSignal = 0;
  let disposed = false;
  const unsubscribe = watchBarUsage(usage => {
    label.label = `CPU ${percent(usage.cpu)} · RAM ${usage.memory ? bytes(usage.memory.used) : "—"}`;
    button.tooltip_text = `System usage${usage.memory ? `\nMemory ${bytes(usage.memory.used)} / ${bytes(usage.memory.total)}` : ""}`;
  });
  function releasePanel() {
    monitor?.stop(); monitor = null;
    if (releaseIdle) { GLib.source_remove(releaseIdle); releaseIdle = 0; }
    if (panel) {
      if (closedSignal) panel.disconnect(closedSignal);
      closedSignal = 0;
      panel.set_child(null);
      panel.unparent(); panel = null;
    }
  }
  function open() {
    if (disposed) return;
    if (panel) { panel.popdown(); return; }
    const body = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 14, css_classes: ["system-usage-panel"] });
    const header = new Gtk.Box({ spacing: 12 });
    header.append(new Gtk.Label({ label: "System usage", xalign: 0, hexpand: true, css_classes: ["system-usage-title"] }));
    const close = new Gtk.Button({ icon_name: "window-close-symbolic", tooltip_text: "Close system usage" });
    header.append(close); body.append(header);
    const rows = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 });
    body.append(rows);
    body.append(new Gtk.Label({ label: "Stats: every 2 seconds\nDisk: every 30 seconds · Stops when closed", xalign: 0, css_classes: ["system-usage-hint"] }));
    const values = new Map<string, Gtk.Label>();
    function row(key: string, title: string) {
      const line = new Gtk.Box({ spacing: 20 });
      line.append(new Gtk.Label({ label: title, xalign: 0, hexpand: true, css_classes: ["system-usage-name"] }));
      const value = new Gtk.Label({ label: "—", xalign: 1, css_classes: ["system-usage-value"] });
      line.append(value); rows.append(line); values.set(key, value);
    }
    row("cpu", "CPU usage"); row("temperature", "CPU temperature"); row("memory", "Memory usage");
    function update(value: Details) {
      values.get("cpu")!.label = percent(value.cpu);
      values.get("temperature")!.label = value.temperature === null ? "Unavailable" : `${value.temperature.toFixed(1)} °C`;
      values.get("memory")!.label = value.memory ? `${percent(value.memory.percent)}  (${bytes(value.memory.used)} / ${bytes(value.memory.total)})` : "Unavailable";
      if (!value.gpus.length && !values.has("no-gpu")) row("no-gpu", "GPU (unavailable)");
      for (const gpu of value.gpus) {
        const key = `gpu:${gpu.name}`;
        if (!values.has(key)) { row(key, `${gpu.name} usage`); row(`${key}:temp`, `${gpu.name} temperature`); }
        values.get(key)!.label = gpu.state || (gpu.usage === null ? "Unavailable" : percent(gpu.usage));
        values.get(`${key}:temp`)!.label = gpu.state || (gpu.temperature === null ? "Unavailable" : `${gpu.temperature.toFixed(1)} °C`);
      }
      if (!value.disks.length && !values.has("no-disk")) row("no-disk", "Disk (unavailable)");
      for (const disk of value.disks) {
        const key = `disk:${disk.path}`;
        if (!values.has(key)) row(key, `Disk ${disk.path}`);
        values.get(key)!.label = `${percent(100 * disk.used / disk.total)}  (${bytes(disk.used)} / ${bytes(disk.total)})`;
      }
    }
    panel = new Gtk.Popover({ child: body, position: Gtk.PositionType.BOTTOM, autohide: true, css_classes: ["system-usage-popover"] });
    panel.set_parent(button);
    close.connect("clicked", () => panel?.popdown());
    closedSignal = panel.connect("closed", () => {
      monitor?.stop(); monitor = null;
      // Release outside the closed signal's GTK stack, while JS is still alive.
      releaseIdle = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        releaseIdle = 0; releasePanel(); return GLib.SOURCE_REMOVE;
      });
    });
    monitor = new DetailMonitor(update);
    panel.popup();
  }
  button.connect("clicked", open);
  const dispose = () => {
    if (disposed) return;
    disposed = true; unsubscribe(); releasePanel();
  };
  button.connect("destroy", dispose);
  onCleanup(dispose);
  return button;
}
