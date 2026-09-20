import { Gtk } from "ags/gtk4"
import { createEffect } from "ags"

export function IconButton(props: { icon: string; tooltip?: string; onClicked?: () => void; class?: string }) {
  return (
    <button class={`gtk-reset bar-button ${props.class ?? ""}`} tooltipText={props.tooltip} onClicked={props.onClicked}>
      <label label={props.icon} />
    </button>
  )
}

export function Section(props: { title: string; children: JSX.Element | JSX.Element[]; class?: string }) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={10} class={`panel-section ${props.class ?? ""}`}>
      <label label={props.title} xalign={0} class="section-title" />
      {props.children}
    </box>
  )
}

export function Metric(props: { icon: string; name: string; value: ReturnType<any> | string; fraction: ReturnType<any> | number }) {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={5} class="metric-card">
      <box spacing={8}>
        <label label={props.icon} class="text-primary" />
        <label label={props.name} xalign={0} hexpand class="font-semibold" />
        <label label={props.value as never} class="text-muted" />
      </box>
      <Gtk.ProgressBar fraction={props.fraction as never} />
    </box>
  )
}

export function ActionButton(props: { icon: string; label: string; onClicked: () => void; class?: string }) {
  return (
    <button class={`gtk-reset action-button ${props.class ?? ""}`} onClicked={props.onClicked}>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
        <label label={props.icon} class="text-xl" />
        <label label={props.label} class="text-xs" />
      </box>
    </button>
  )
}

export function Gauge(props: {
  icon: string; name: string; value: any; detail?: any; fraction: any; color: [number, number, number]
}) {
  const fraction = typeof props.fraction === "function" ? props.fraction : () => props.fraction
  const area = new Gtk.DrawingArea({ contentWidth: 128, contentHeight: 108 })
  area.set_draw_func((_, cr, width, height) => {
    const cx = width / 2
    const cy = height * 0.62
    const radius = Math.min(width, height) * 0.43
    const start = Math.PI * 0.75
    const span = Math.PI * 1.5
    cr.setLineWidth(6)
    cr.setSourceRGBA(0.20, 0.21, 0.25, 1)
    cr.arc(cx, cy, radius, start, start + span)
    cr.stroke()
    cr.setSourceRGBA(props.color[0], props.color[1], props.color[2], 1)
    cr.arc(cx, cy, radius, start, start + span * Math.max(0, Math.min(1, Number(fraction()))))
    cr.stroke()
  })
  createEffect(() => { fraction(); area.queue_draw() })
  const value = (
    <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} class="gauge-value">
      <label label={props.value} class="font-bold" />
      {props.detail && <label label={props.detail} class="text-xs text-muted" />}
    </box>
  ) as Gtk.Widget
  const overlay = new Gtk.Overlay({ widthRequest: 128, heightRequest: 108 })
  overlay.set_child(area)
  overlay.add_overlay(value)
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={2} class="gauge-card">
      {overlay}
      <label label={`${props.icon} ${props.name}`} class="gauge-name" />
    </box>
  )
}
