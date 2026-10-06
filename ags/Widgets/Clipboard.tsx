import Astal from "gi://Astal?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import Gdk from "gi://Gdk?version=4.0";
import GdkPixbuf from "gi://GdkPixbuf?version=2.0";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Pango from "gi://Pango";
import { onCleanup } from "ags";
import { ClipboardHistory, type ClipboardEntry } from "../services/Clipboard";

export default function Clipboard({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  const history = new ClipboardHistory();
  let entries: ClipboardEntry[] = [];
  let filtered: ClipboardEntry[] = [];
  let byId = new Map<string, ClipboardEntry>();
  let revision = 0;
  let busy = false;
  let win: Astal.Window;
  const previews = new Map<string, Promise<Gdk.Texture | null>>();
  const search = new Gtk.SearchEntry({ placeholder_text: "Search clipboard history…", hexpand: true });
  const status = new Gtk.Label({ xalign: 0, css_classes: ["clipboard-status"], wrap: true });
  const count = new Gtk.Label({ css_classes: ["clipboard-count"] });
  const empty = new Gtk.Label({ label: "Clipboard is empty", vexpand: true, css_classes: ["clipboard-empty"] });
  const model = new Gtk.StringList();
  const selection = new Gtk.SingleSelection({ model, autoselect: true, can_unselect: false });
  const factory = new Gtk.SignalListItemFactory();

  function errorMessage(error: unknown) { status.label = String(error); }

  function filter() {
    const selectedId = filtered[selection.get_selected()]?.id;
    const query = search.text.toLocaleLowerCase();
    filtered = entries.filter(entry => entry.text.toLocaleLowerCase().includes(query));
    model.splice(0, model.get_n_items(), filtered.map(entry => entry.id));
    const index = filtered.findIndex(entry => entry.id === selectedId);
    if (filtered.length) selection.set_selected(Math.max(0, index));
    empty.label = query ? "No results found" : "Clipboard is empty";
    empty.visible = filtered.length === 0;
    scroll.visible = filtered.length > 0;
    clear.sensitive = !busy && entries.length > 0;
    count.label = `${filtered.length} / ${entries.length}`;
  }

  async function refresh() {
    const token = ++revision;
    try {
      const items = await history.list();
      if (token !== revision || !win.visible) return;
      entries = items;
      byId = new Map(items.map(entry => [entry.id, entry]));
      status.label = "";
      filter();
    } catch (error) { if (token === revision && win.visible) errorMessage(error); }
  }

  async function copy(entry: ClipboardEntry | undefined) {
    if (!entry || busy) return;
    busy = true;
    try {
      await history.copy(entry);
      win.hide();
    } catch (error) { errorMessage(error); }
    finally { busy = false; }
  }

  async function remove(id: string) {
    if (busy) return;
    busy = true;
    try {
      await history.remove(id);
      previews.delete(id);
      await refresh();
    } catch (error) { errorMessage(error); }
    finally { busy = false; clear.sensitive = entries.length > 0; }
  }

  function thumbnail(entry: ClipboardEntry): Promise<Gdk.Texture | null> {
    const cached = previews.get(entry.id);
    if (cached) return cached;
    const pending = history.decode(entry.id).then(bytes => new Promise<Gdk.Texture>((resolve, reject) => {
      const stream = Gio.MemoryInputStream.new_from_bytes(bytes);
      GdkPixbuf.Pixbuf.new_from_stream_at_scale_async(stream, 160, 80, true, null, (_source, result) => {
        try { resolve(Gdk.Texture.new_for_pixbuf(GdkPixbuf.Pixbuf.new_from_stream_finish(result))); }
        catch (error) { reject(error); }
        finally { stream.close(null); }
      });
    })).catch(() => null);
    // Bound decoded textures; they stay in memory and are cleared on close.
    if (previews.size >= 32) previews.delete(previews.keys().next().value!);
    previews.set(entry.id, pending);
    return pending;
  }

  const setupSignal = factory.connect("setup", (_factory, item: Gtk.ListItem) => {
    const row = new Gtk.Box({ spacing: 12, css_classes: ["clipboard-row"] });
    const content = new Gtk.Box({ spacing: 12 });
    const copyButton = new Gtk.Button({ child: content, hexpand: true, tooltip_text: "Copy clipboard item", css_classes: ["clipboard-copy"] });
    const icon = new Gtk.Image({ icon_name: "edit-paste-symbolic" });
    const picture = new Gtk.Picture({ width_request: 160, height_request: 80, content_fit: Gtk.ContentFit.CONTAIN });
    const label = new Gtk.Label({ xalign: 0, hexpand: true, ellipsize: Pango.EllipsizeMode.END, max_width_chars: 48 });
    const removeButton = new Gtk.Button({ icon_name: "edit-delete-symbolic", tooltip_text: "Delete clipboard item", valign: Gtk.Align.CENTER, css_classes: ["clipboard-delete"] });
    const view = { row, icon, picture, label, removeButton, id: "", serial: 0 };
    (item as any).clipboardView = view;
    copyButton.connect("clicked", () => void copy(byId.get(view.id)));
    removeButton.connect("clicked", () => void remove(view.id));
    content.append(icon); content.append(picture); content.append(label);
    row.append(copyButton); row.append(removeButton);
    item.set_child(row);
  });

  const bindSignal = factory.connect("bind", (_factory, item: Gtk.ListItem) => {
    const view = (item as any).clipboardView;
    const id = (item.get_item() as Gtk.StringObject).get_string();
    const entry = byId.get(id)!;
    view.id = id;
    const serial = ++view.serial;
    view.label.label = entry.text;
    view.label.tooltip_text = entry.text;
    view.picture.paintable = null;
    view.picture.visible = entry.isImage;
    view.icon.icon_name = entry.isImage ? "image-x-generic-symbolic" : "edit-paste-symbolic";
    if (entry.isImage) void thumbnail(entry).then(texture => {
      if (view.serial === serial && win.visible) view.picture.paintable = texture;
    });
  });
  const unbindSignal = factory.connect("unbind", (_factory, item: Gtk.ListItem) => {
    const view = (item as any).clipboardView;
    view.serial++;
    view.picture.paintable = null;
  });

  const list = new Gtk.ListView({ model: selection, factory, single_click_activate: true, css_classes: ["clipboard-list"] });
  list.connect("activate", (_list, position) => void copy(filtered[position]));
  const scroll = new Gtk.ScrolledWindow({ child: list, vexpand: true,
    hscrollbar_policy: Gtk.PolicyType.NEVER, overlay_scrolling: false });
  const clear = new Gtk.Button({ label: "Clear all history", css_classes: ["clipboard-clear"], sensitive: false });
  clear.connect("clicked", async () => {
    if (busy || !entries.length) return;
    busy = true;
    clear.sensitive = false;
    try { await history.clear(); previews.clear(); await refresh(); }
    catch (error) { errorMessage(error); }
    finally { busy = false; clear.sensitive = entries.length > 0; }
  });
  const close = new Gtk.Button({ icon_name: "window-close-symbolic", tooltip_text: "Close clipboard", css_classes: ["clipboard-close"] });
  close.connect("clicked", () => win.hide());
  const header = new Gtk.Box({ spacing: 12 });
  header.append(new Gtk.Label({ label: "Clipboard", hexpand: true, xalign: 0, css_classes: ["clipboard-title"] }));
  header.append(count); header.append(clear); header.append(close);
  const body = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, css_classes: ["clipboard-panel"], width_request: 600, height_request: 480 });
  body.append(header); body.append(search); body.append(status); body.append(empty); body.append(scroll);
  body.append(new Gtk.Label({ label: "↑ ↓ Select   ·   Enter Copy   ·   Esc Close", css_classes: ["clipboard-hint"] }));
  search.connect("search-changed", filter);
  search.connect("activate", () => void copy(filtered[selection.get_selected()]));
  const keys = new Gtk.EventControllerKey({ name: "clipboard-keys", propagation_phase: Gtk.PropagationPhase.CAPTURE });
  keys.connect("key-pressed", (_controller, key, _code, modifiers) => {
    if (key === Gdk.KEY_Escape) { win.hide(); return Gdk.EVENT_STOP; }
    if (key === Gdk.KEY_Down || key === Gdk.KEY_Up) {
      if (filtered.length) {
        const offset = key === Gdk.KEY_Down ? 1 : -1;
        const index = Math.max(0, Math.min(filtered.length - 1, selection.get_selected() + offset));
        selection.set_selected(index);
        list.scroll_to(index, Gtk.ListScrollFlags.FOCUS, null);
        search.grab_focus();
      }
      return Gdk.EVENT_STOP;
    }
    if ((modifiers & Gdk.ModifierType.CONTROL_MASK) && (key === Gdk.KEY_f || key === Gdk.KEY_F)) {
      search.grab_focus(); return Gdk.EVENT_STOP;
    }
    if ((key === Gdk.KEY_Return || key === Gdk.KEY_KP_Enter) && !(win.get_focus() instanceof Gtk.Button)) {
      void copy(filtered[selection.get_selected()]); return Gdk.EVENT_STOP;
    }
    return Gdk.EVENT_PROPAGATE;
  });

  win = new Astal.Window({ name: `clipboard-${gdkmonitor.connector}`, namespace: "clipboard",
    gdkmonitor, child: body, visible: false, layer: Astal.Layer.OVERLAY,
    exclusivity: Astal.Exclusivity.IGNORE, keymode: Astal.Keymode.EXCLUSIVE });
  win.add_controller(keys);
  win.connect("notify::visible", () => {
    if (win.visible) {
      search.text = "";
      search.grab_focus();
      try { history.watch(() => void refresh()); } catch (error) { errorMessage(error); }
      void refresh();
    } else {
      revision++;
      history.stopWatching();
      previews.clear();
      entries = []; filtered = []; byId.clear(); model.splice(0, model.get_n_items(), []);
    }
  });
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    revision++;
    history.stopWatching();
    previews.clear();
    // Unbind while JS is alive rather than leaving factory callbacks to GC.
    list.set_model(null);
    list.set_factory(null);
    factory.disconnect(setupSignal);
    factory.disconnect(bindSignal);
    factory.disconnect(unbindSignal);
    selection.set_model(null);
  };
  win.connect("destroy", dispose);
  onCleanup(dispose);
  return win;
}
