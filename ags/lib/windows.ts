import app from "ags/gtk4/app"
import { Astal } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"

export type PanelName =
  | "dashboard"
  | "calendar"
  | "media"
  | "notifications"
  | "battery"
  | "quicksettings"
  | "chatgpt"
  | "launcher"
  | "clipboard"
  | "cheatsheet"

const panels: PanelName[] = [
  "dashboard", "calendar", "media", "notifications", "battery",
  "quicksettings", "chatgpt", "launcher", "clipboard", "cheatsheet",
]

const dropdownPanels: PanelName[] = [
  "dashboard", "calendar", "media", "notifications", "battery",
]
const utilityPanels: PanelName[] = ["launcher", "clipboard", "cheatsheet"]
const persistentPanels = new Set<PanelName>(["quicksettings", "chatgpt"])

type PanelAnchor = { source: any; width: number }
const panelAnchors = new Map<string, PanelAnchor>()

function anchorKey(panel: PanelName, monitor: number) {
  return `${panel}-${monitor}`
}

export function registerPanelAnchor(panel: PanelName, monitor: number, source: any, width: number) {
  panelAnchors.set(anchorKey(panel, monitor), { source, width })
}

function positionBelowAnchor(panel: PanelName, monitor: number) {
  const anchor = panelAnchors.get(anchorKey(panel, monitor))
  const target: any = app.get_window(`${panel}-${monitor}`)
  if (!anchor || !target) return

  const root = anchor.source.get_root()
  if (!root) return

  const [ok, bounds] = anchor.source.compute_bounds(root)
  const geometry = app.get_monitors()[monitor]?.get_geometry()
  if (!ok || !geometry) return

  const center = bounds.origin.x + bounds.size.width / 2
  const left = Math.max(8, Math.min(geometry.width - anchor.width - 8, center - anchor.width / 2))
  target.set_anchor(Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT)
  target.set_margin_left(Math.round(left))
  target.set_margin_right(0)
  // NORMAL layer surfaces begin immediately after the exclusive bar area.
  target.set_margin_top(0)
}

function monitorIndexFromHyprland() {
  const focused = Hyprland.get_default().get_focused_monitor()
  if (!focused) return 0

  const connector = focused.get_name()
  const monitors = app.get_monitors()
  const index = monitors.findIndex((monitor) => monitor.get_connector() === connector)
  return index >= 0 ? index : 0
}

export function closePanels() {
  for (const panel of panels) {
    // These panels may only be closed by Escape or their own shortcut/button.
    if (persistentPanels.has(panel)) continue
    for (let i = 0; i < app.get_monitors().length; i++) {
      const win = app.get_window(`${panel}-${i}`)
      if (win) win.visible = false
    }
  }
}

function closeGroup(group: PanelName[]) {
  for (const panel of group) {
    for (let i = 0; i < app.get_monitors().length; i++) {
      const win = app.get_window(`${panel}-${i}`)
      if (win) win.visible = false
    }
  }
}

export function togglePanel(panel: PanelName, monitor = monitorIndexFromHyprland()) {
  const target = app.get_window(`${panel}-${monitor}`)
  if (!target) return false

  const shouldShow = !target.visible
  if (dropdownPanels.includes(panel)) closeGroup(dropdownPanels)
  else if (utilityPanels.includes(panel)) closeGroup(utilityPanels)
  if (shouldShow) positionBelowAnchor(panel, monitor)
  target.visible = shouldShow
  if (shouldShow) target.present()
  return shouldShow
}

export function togglePanelBelow(panel: PanelName, monitor: number, source: any, width: number) {
  registerPanelAnchor(panel, monitor, source, width)
  return togglePanel(panel, monitor)
}

export function openPanel(panel: PanelName, monitor = monitorIndexFromHyprland()) {
  const target = app.get_window(`${panel}-${monitor}`)
  if (!target) return false
  if (dropdownPanels.includes(panel)) closeGroup(dropdownPanels)
  else if (utilityPanels.includes(panel)) closeGroup(utilityPanels)
  positionBelowAnchor(panel, monitor)
  target.visible = true
  target.present()
  return true
}
