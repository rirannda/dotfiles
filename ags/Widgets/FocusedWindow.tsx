import Hyprland from "gi://AstalHyprland";
import Gtk from "gi://Gtk?version=4.0";
import Pango from "gi://Pango";
import { onCleanup } from "ags";

export default function FocusedWindow() {
  const hypr = Hyprland.get_default();
  const label = new Gtk.Label({
    ellipsize: Pango.EllipsizeMode.END,
    max_width_chars: 34,
  });
  const box = new Gtk.Box({
    spacing: 6,
    valign: Gtk.Align.CENTER,
    css_classes: ["bar-info", "focused-window"],
  });
  // box.append(new Gtk.Image({ icon_name: "application-x-executable-symbolic", pixel_size: 14 }));
  box.append(label);
  let client: Hyprland.Client | null = null;
  let clientSignals: number[] = [];
  function update() {
    const name = client?.get_class() || client?.get_initial_class() || "Window";
    const title = client?.get_title() || "";
    label.label = client ? `${title ? `${title} · ` : ""}${name}` : "Desktop";
    box.tooltip_text = client
      ? `${name}${title ? `\n${title}` : ""}\nWorkspace ${client.get_workspace()?.id ?? "—"} · PID ${client.get_pid()}`
      : "No focused window";
  }
  function disconnect() {
    if (client) clientSignals.forEach((id) => client!.disconnect(id));
    clientSignals = [];
    client = null;
  }
  function focusChanged() {
    disconnect();
    client = hypr.get_focused_client();
    if (client)
      clientSignals = ["title", "class", "workspace"].map((property) =>
        client!.connect(`notify::${property}`, update),
      );
    update();
  }
  const focusSignal = hypr.connect("notify::focused-client", focusChanged);
  // The installed Astal version does not refresh titles for windowtitlev2.
  // Update its local client cache directly from the compositor's event payload.
  const titleSignal = hypr.connect(
    "event",
    (_hypr, event: string, args: string) => {
      if (event !== "windowtitlev2") return;
      const comma = args.indexOf(",");
      if (comma < 0) return;
      const changed = hypr.get_client(args.slice(0, comma).replace(/^0x/, ""));
      const title = args.slice(comma + 1);
      if (changed && changed.get_title() !== title) changed.title = title;
    },
  );
  focusChanged();
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    hypr.disconnect(focusSignal);
    hypr.disconnect(titleSignal);
    disconnect();
  };
  box.connect("destroy", dispose);
  onCleanup(dispose);
  return box;
}
