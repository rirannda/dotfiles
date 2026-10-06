import app from "ags/gtk4/app";
import Astal from "gi://Astal?version=4.0";
import Gdk from "gi://Gdk?version=4.0";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk?version=4.0";
import Pango from "gi://Pango";
import { onCleanup } from "ags";
import { watchMedia, type MediaInfo } from "../services/Media";

export default function MusicPopup({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  let current: MediaInfo;
  const cover = new Gtk.Picture({ width_request: 100, height_request: 100, can_shrink: true,
    content_fit: Gtk.ContentFit.COVER, css_classes: ["album-cover"] });
  const title = new Gtk.Label({ label: "No media playing", xalign: 0, ellipsize: Pango.EllipsizeMode.END,
    max_width_chars: 35, css_classes: ["track-title"] });
  const artist = new Gtk.Label({ xalign: 0, ellipsize: Pango.EllipsizeMode.END,
    max_width_chars: 35, css_classes: ["track-artist"] });
  const playIcon = new Gtk.Image({ icon_name: "media-playback-start-symbolic", pixel_size: 18 });
  const controls = new Gtk.Box({ spacing: 8, css_classes: ["controls"] });
  function control(icon: string | Gtk.Image, tooltip: string, action: () => void) {
    const button = new Gtk.Button({ child: typeof icon === "string" ? new Gtk.Image({ icon_name: icon, pixel_size: 18 }) : icon,
      tooltip_text: tooltip, css_classes: ["control-button"] });
    button.connect("clicked", action); controls.append(button); return button;
  }
  const previous = control("media-skip-backward-symbolic", "Previous track", () => current.player?.previous());
  const play = control(playIcon, "Play / Pause", () => current.player?.play_pause());
  const next = control("media-skip-forward-symbolic", "Next track", () => current.player?.next());
  const info = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 });
  info.append(title); info.append(artist); info.append(controls);
  const content = new Gtk.Box({ spacing: 16, css_classes: ["music-popup-content"] });
  content.append(cover); content.append(info);
  const window = new Astal.Window({ visible: false, name: `music-popup-${gdkmonitor.connector}`, gdkmonitor,
    anchor: Astal.WindowAnchor.BOTTOM, exclusivity: Astal.Exclusivity.NORMAL, application: app,
    keymode: Astal.Keymode.ON_DEMAND, css_classes: ["music-popup-window"], child: content });
  let lastCover = "";
  const unsubscribe = watchMedia(value => {
    current = value;
    title.label = value.title; title.tooltip_text = value.title;
    artist.label = value.artist || value.identity;
    playIcon.icon_name = value.playing ? "media-playback-pause-symbolic" : "media-playback-start-symbolic";
    previous.sensitive = !!value.player?.get_can_go_previous();
    next.sensitive = !!value.player?.get_can_go_next();
    play.sensitive = !!value.player && (value.playing ? value.player.get_can_pause() : value.player.get_can_play());
    if (lastCover !== value.coverArt) {
      lastCover = value.coverArt;
      const file = value.coverArt.startsWith("file://") ? Gio.File.new_for_uri(value.coverArt).get_path()
        : value.coverArt.startsWith("/") ? value.coverArt : null;
      cover.set_filename(file);
    }
  });
  let disposed = false;
  const dispose = () => { if (disposed) return; disposed = true; unsubscribe(); };
  window.connect("destroy", dispose); onCleanup(dispose);
  return window;
}
