import app from "ags/gtk4/app"
import style from "./styles/style.css"
import { Bar } from "./widgets/bar"
import { Panels } from "./widgets/panels"
import { PanelName, togglePanel } from "./lib/windows"

const commands = new Set<PanelName>([
  "dashboard", "calendar", "media", "notifications", "battery", "quicksettings",
  "chatgpt", "launcher", "clipboard", "cheatsheet",
])

app.start({
  instanceName: "ags-shell",
  css: style,
  requestHandler(argv, response) {
    const [verb, panel] = argv
    if (verb === "toggle" && commands.has(panel as PanelName)) {
      response(togglePanel(panel as PanelName) ? `opened ${panel}` : `closed ${panel}`)
      return
    }
    response(`unknown request: ${argv.join(" ")}`)
  },
  main() {
    app.get_monitors().forEach((gdkmonitor, monitor) => {
      Bar(monitor, gdkmonitor)
      Panels(monitor, gdkmonitor)
    })
  },
})
