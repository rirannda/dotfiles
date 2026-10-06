import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import { createPoll } from "ags/time";

export default function Clock({
  format,
}: {
  format?: string;
  gdkmonitor: Gdk.Monitor;
}) {
  const time = createPoll("", 30_000, () => {
    const now = GLib.DateTime.new_now_local();
    const weekday = ["Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat.", "Sun."][now.get_day_of_week() - 1];
    return now.format(format ?? `%H:%M ${weekday} %m/%d`) || "00:00";
  });

  return (
    <box cssClasses={["clock"]} heightRequest={24} valign={Gtk.Align.CENTER}>
      <box spacing={8} valign={Gtk.Align.CENTER}>
        <label cssClasses={["clock-label"]} label={time} />
      </box>
    </box>
  );
}
