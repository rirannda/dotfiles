import Gtk from "gi://Gtk?version=4.0";
import { brightness } from "../services/Brightness";

export default function BrightnessValue() {
  return (
    <label
      cssClasses={["brightness-value"]}
      widthChars={4}
      xalign={1}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        const unsubscribe = brightness.subscribe((value) => {
          self.label = `${Math.round(value * 100)}%`;
        });
        self.connect("destroy", unsubscribe);
      }}
    />
  );
}
