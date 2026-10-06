import app from "ags/gtk4/app";
import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import Pango from "gi://Pango";
import { onCleanup } from "ags";
import { watchMedia } from "../services/Media";
import { shortenMediaText } from "../utils/MediaText";

export default function Media({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  const icon = new Gtk.Image({ icon_name: "media-playback-start-symbolic", pixel_size: 14 });
  const title = new Gtk.Label({ ellipsize: Pango.EllipsizeMode.END, max_width_chars: 14, width_chars: 4 });
  const artist = new Gtk.Label({ ellipsize: Pango.EllipsizeMode.END, max_width_chars: 14, width_chars: 4 });
  const separator = new Gtk.Label({ label: " - " });
  const text = new Gtk.Box(); text.append(title); text.append(separator); text.append(artist);
  const content = new Gtk.Box({ spacing: 6 }); content.append(icon); content.append(text);
  const button = new Gtk.Button({ child: content, valign: Gtk.Align.CENTER, height_request: 24, css_classes: ["bar-button", "bar-media"] });
  button.connect("clicked", () => app.toggle_window(`music-popup-${gdkmonitor.connector}`));
  const unsubscribe = watchMedia(info => {
    title.label = info.playing ? shortenMediaText(info.title) : "Not playing";
    artist.label = shortenMediaText(info.artist);
    separator.visible = artist.visible = info.playing && !!info.artist.trim();
    icon.icon_name = info.playing ? "media-playback-start-symbolic" : "media-playback-pause-symbolic";
    const metadata = info.player ? `${info.title}${info.artist ? `\n${info.artist}` : ""}${info.identity ? `\n${info.identity}` : ""}` : "";
    button.tooltip_text = `${info.playing ? "Playing" : "Not playing"}${metadata ? `: ${metadata}` : ""}\nClick to open music`;
  });
  let disposed = false;
  const dispose = () => { if (disposed) return; disposed = true; unsubscribe(); };
  button.connect("destroy", dispose); onCleanup(dispose);
  return button;
}
