import { Gtk } from "ags/gtk4"

/** Open the StatusNotifierItem's exported DBus menu at its tray button. */
export function openTrayMenu(button: Gtk.Widget, item: any) {
  item.about_to_show()
  const model = item.get_menu_model()
  const actions = item.get_action_group()

  // A few legacy items do not export a menu model.
  if (!model || !actions) {
    item.secondary_activate(0, 0)
    return
  }

  button.insert_action_group("dbusmenu", actions)
  const popover = Gtk.PopoverMenu.new_from_model(model)
  popover.set_has_arrow(true)
  popover.set_position(Gtk.PositionType.BOTTOM)
  popover.set_parent(button)
  popover.connect("closed", () => popover.unparent())
  popover.popup()
}

/** Capture button 3 before Gtk.Button can consume it as a normal click. */
export function addTrayRightClick(button: Gtk.Widget, item: any) {
  const gesture = new Gtk.GestureClick({
    button: 3,
    propagationPhase: Gtk.PropagationPhase.CAPTURE,
  })
  gesture.connect("pressed", () => {
    gesture.set_state(Gtk.EventSequenceState.CLAIMED)
    openTrayMenu(button, item)
  })
  button.add_controller(gesture)
}
