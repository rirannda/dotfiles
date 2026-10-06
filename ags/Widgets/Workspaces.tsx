import Hyprland from "gi://AstalHyprland";
import Gtk from "gi://Gtk?version=4.0";
import { onCleanup } from "ags";
import { workspaceCount } from "../services/Preferences";

export default function Workspaces() {
  const hypr = Hyprland.get_default();
  const box = new Gtk.Box({ css_classes: ["workspaces-container"], halign: Gtk.Align.CENTER,
    valign: Gtk.Align.CENTER, height_request: 24 });
  const dots: Gtk.Box[] = [];
  const workspaceSignals = new Map<Hyprland.Workspace, number>();
  function update() {
    const focused = hypr.get_focused_workspace()?.id;
    dots.forEach((dot, index) => {
      const id = index + 1;
      const count = hypr.get_workspace(id)?.get_clients().length || 0;
      const state = focused === id ? "active" : count > 0 ? "occupied" : "empty";
      dot.set_css_classes(["dot", state]);
      dot.tooltip_text = `Workspace ${id} · ${state === "active" ? "Active" : state === "occupied" ? "Has windows" : "Empty"} · ${count} windows`;
    });
  }
  function connectWorkspaces() {
    const workspaces = hypr.get_workspaces();
    for (const [workspace, signal] of workspaceSignals) {
      if (!workspaces.includes(workspace)) { workspace.disconnect(signal); workspaceSignals.delete(workspace); }
    }
    for (const workspace of workspaces) {
      if (!workspaceSignals.has(workspace)) workspaceSignals.set(workspace, workspace.connect("notify::clients", update));
    }
    update();
  }
  function syncDots(count: number) {
    for (const dot of dots) box.remove(dot);
    dots.length = 0;
    for (let i = 0; i < count; i++) {
      const dot = new Gtk.Box({ valign: Gtk.Align.CENTER }); dots.push(dot); box.append(dot);
    }
    update();
  }
  const signals = [hypr.connect("notify::focused-workspace", update),
    hypr.connect("notify::workspaces", connectWorkspaces), hypr.connect("notify::clients", update),
    hypr.connect("client-moved", update)];
  connectWorkspaces();
  const unsubscribe = workspaceCount.subscribe(syncDots);
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    unsubscribe(); signals.forEach(id => hypr.disconnect(id));
    for (const [workspace, signal] of workspaceSignals) workspace.disconnect(signal);
    workspaceSignals.clear();
  };
  box.connect("destroy", dispose); onCleanup(dispose);
  return box;
}
