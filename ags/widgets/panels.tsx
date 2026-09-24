import app from "ags/gtk4/app";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import { createPoll } from "ags/time";
import { createEffect, createState, For } from "ags";
import GLib from "gi://GLib?version=2.0";
import WebKit from "gi://WebKit?version=6.0";
import Notifd from "gi://AstalNotifd";
import Hyprland from "gi://AstalHyprland";
import { ActionButton, Gauge, Section } from "./common";
import { closePanels, openPanel, PanelName } from "../lib/windows";
import { clamp, fire, fireSh, sh } from "../lib/shell";
import {
  audioState,
  batteryState,
  brightness,
  connectivity,
  hardwareInfo,
  mediaState,
  systemStats,
} from "../services/polls";

type PopupProps = {
  name: PanelName;
  monitor: number;
  gdkmonitor: any;
  children: JSX.Element;
  side?: "left" | "center" | "right";
  class?: string;
  width?: number;
  height?: number;
  attached?: boolean;
};

function Popup({
  name,
  monitor,
  gdkmonitor,
  children,
  side = "right",
  class: className = "",
  width,
  height,
  attached = false,
}: PopupProps) {
  let pointerEntered = false;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  const cancelAutoHide = () => {
    if (hideTimer !== null) clearTimeout(hideTimer);
    hideTimer = null;
  };
  const horizontal =
    side === "left"
      ? Astal.WindowAnchor.LEFT
      : side === "right"
        ? Astal.WindowAnchor.RIGHT
        : 0;
  return (
    <window
      name={`${name}-${monitor}`}
      namespace={`ags-${name}-${monitor}`}
      application={app}
      visible={false}
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.TOP | horizontal}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      marginTop={attached ? 0 : 48}
      marginLeft={attached ? 8 : 10}
      marginRight={attached ? 8 : 10}
      widthRequest={width}
      heightRequest={height}
    >
      <Gtk.EventControllerKey
        propagationPhase={Gtk.PropagationPhase.CAPTURE}
        onKeyPressed={({ widget }, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            widget.get_root()?.hide();
            return true;
          }
          return false;
        }}
      />
      {attached && (
        <Gtk.EventControllerMotion
          onEnter={() => {
            pointerEntered = true;
            cancelAutoHide();
          }}
          onLeave={({ widget }) => {
            if (!pointerEntered) return;
            pointerEntered = false;
            cancelAutoHide();
            hideTimer = setTimeout(() => {
              // Re-entry cancels this timer, so a panel under the pointer stays visible.
              widget.get_root()?.hide();
              hideTimer = null;
            }, 500);
          }}
        />
      )}
      <box
        orientation={Gtk.Orientation.VERTICAL}
        class={`popup panel-${name} ${attached ? "dropdown" : ""} ${className}`}
      >
        {children}
      </box>
    </window>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <box class="panel-header" spacing={8}>
      <box orientation={Gtk.Orientation.VERTICAL} hexpand>
        <label label={title} xalign={0} class="panel-title" />
        {subtitle && (
          <label label={subtitle} xalign={0} class="text-xs text-muted" />
        )}
      </box>
    </box>
  );
}

function Dashboard({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  return (
    <Popup
      name="dashboard"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      side="left"
      width={350}
      attached
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        spacing={12}
        class="panel-content dashboard-content"
      >
        <box spacing={16} class="dashboard-identity">
          <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={5}
            valign={Gtk.Align.CENTER}
            hexpand
          >
            <label
              label={hardwareInfo.as((s) => s.user)}
              xalign={0}
              class="dashboard-user"
            />
            <label label={hardwareInfo.as((s) => `  ${s.os}`)} xalign={0} />
            <label label={systemStats.as((s) => `󰥔  ${s.uptime}`)} xalign={0} />
          </box>
        </box>
        <box homogeneous spacing={8} class="gauge-grid">
          <Gauge
            icon=""
            name="CPU"
            value={systemStats.as((s) => `${s.cpu.toFixed(0)}%`)}
            detail={systemStats.as((s) => `${s.cpuTemp}°C`)}
            fraction={systemStats.as((s) => clamp(s.cpu / 100))}
            color={[0.32, 0.76, 0.98]}
          />
          <Gauge
            icon=""
            name="RAM"
            value={systemStats.as((s) => `${s.ram.toFixed(0)}%`)}
            fraction={systemStats.as((s) => clamp(s.ram / 100))}
            color={[0.65, 0.43, 0.96]}
          />
        </box>
        <box homogeneous spacing={8} class="gauge-grid">
          <Gauge
            icon="󰢮"
            name="GPU"
            value={systemStats.as((s) => `${s.gpu}%`)}
            detail={systemStats.as((s) => `${s.gpuTemp}°C`)}
            fraction={systemStats.as((s) => clamp(Number(s.gpu) / 100))}
            color={[0.52, 0.83, 0.4]}
          />
          <Gauge
            icon="󰋊"
            name="DISK"
            value={systemStats.as((s) => `${s.disk.toFixed(0)}%`)}
            fraction={systemStats.as((s) => clamp(s.disk / 100))}
            color={[1.0, 0.63, 0.12]}
          />
        </box>
      </box>
    </Popup>
  );
}

function CalendarPanel({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  return (
    <Popup
      name="calendar"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      side="center"
      width={340}
      attached
    >
      <box class="calendar-wrap">
        <Gtk.Calendar hexpand vexpand />
      </box>
    </Popup>
  );
}

const coverPath = createPoll("", 1600, async (previous) => {
  const art = mediaState.peek().art;
  if (!art) return "";
  if (art.startsWith("file://")) return decodeURIComponent(art.slice(7));
  if (!art.startsWith("http")) return art;
  const target = `${GLib.get_user_cache_dir()}/ags-shell/media-cover`;
  await sh(
    `mkdir -p "${GLib.get_user_cache_dir()}/ags-shell"; curl -Lfs --max-time 5 '${art.replaceAll("'", "'\\''")}' -o '${target}'`,
  );
  return target || previous;
});

function marquee(source: any, limit = 34) {
  let offset = 0;
  let previous = "";
  return createPoll("", 160, () => {
    const value = String(source.peek ? source.peek() : source());
    if (value !== previous) {
      previous = value;
      offset = 0;
    }
    const chars = Array.from(value);
    if (chars.length <= limit) return value;
    const loop = Array.from(`${value}   •   ${value}`);
    const visible = loop.slice(offset, offset + limit).join("");
    offset = (offset + 1) % (chars.length + 7);
    return visible;
  });
}

function MediaPanel({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  const title = marquee(
    mediaState.as((s) => s.title),
    18,
  );
  const artist = marquee(
    mediaState.as((s) => s.artist),
    28,
  );
  return (
    <Popup
      name="media"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      width={390}
      attached
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        spacing={14}
        class="panel-content media-content"
      >
        <Gtk.ScrolledWindow
          widthRequest={125}
          heightRequest={125}
          minContentWidth={125}
          maxContentWidth={250}
          minContentHeight={125}
          maxContentHeight={250}
          propagateNaturalWidth={false}
          propagateNaturalHeight={false}
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.NEVER}
          halign={Gtk.Align.CENTER}
          class="media-cover-frame"
        >
          <Gtk.Picture
            canShrink
            hexpand
            vexpand
            contentFit={Gtk.ContentFit.COVER}
            class="media-cover"
            $={(picture) =>
              createEffect(() => {
                const path = coverPath();
                if (path) picture.set_filename(path);
              })
            }
          />
        </Gtk.ScrolledWindow>
        <box orientation={Gtk.Orientation.VERTICAL}>
          <label
            label={title}
            class="text-xl font-bold media-marquee"
            maxWidthChars={18}
          />
          <label
            label={artist}
            class="text-muted media-marquee"
            maxWidthChars={28}
          />
        </box>
        <box homogeneous spacing={10} class="media-controls">
          <button
            class="gtk-reset media-control"
            onClicked={() =>
              fire(["playerctl", "-p", mediaState.peek().player, "previous"])
            }
          >
            <label label="󰒮" />
          </button>
          <button
            class="gtk-reset media-control primary"
            onClicked={() =>
              fire(["playerctl", "-p", mediaState.peek().player, "play-pause"])
            }
          >
            <label
              label={mediaState.as((s) => (s.status === "Playing" ? "󰏤" : "󰐊"))}
            />
          </button>
          <button
            class="gtk-reset media-control"
            onClicked={() =>
              fire(["playerctl", "-p", mediaState.peek().player, "next"])
            }
          >
            <label label="󰒭" />
          </button>
        </box>
      </box>
    </Popup>
  );
}

function NotificationsPanel({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  const notifd = Notifd.get_default();
  const read = () => [...notifd.get_notifications()].reverse() as any[];
  const [notifications, setNotifications] = createState(read());
  const refresh = () => setNotifications(read());
  notifd.connect("notified", refresh);
  notifd.connect("resolved", refresh);
  return (
    <Popup
      name="notifications"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      width={390}
      height={620}
      attached
    >
      <box class="notification-actions">
        <button
          class="gtk-reset text-button"
          onClicked={() => {
            for (const n of notifd.get_notifications()) n.dismiss();
          }}
        >
          <label label="Clear All" />
        </button>
      </box>
      <scrolledwindow vexpand class="panel-scroll">
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={8}
          class="panel-content"
        >
          <label
            visible={notifications.as((list) => list.length === 0)}
            label="No notifications."
            class="empty-state"
          />
          <For each={notifications} id={(n: any) => n.id}>
            {(notification: any) => (
              <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={4}
                class="notification-card"
              >
                <box spacing={8}>
                  <label
                    label={notification.appIcon ? "●" : ""}
                    class="text-primary"
                  />
                  <label
                    label={notification.summary || notification.appName}
                    xalign={0}
                    hexpand
                    class="font-semibold"
                  />
                </box>
                <label
                  label={notification.body || ""}
                  xalign={0}
                  wrap
                  maxWidthChars={42}
                  class="text-muted text-sm"
                />
              </box>
            )}
          </For>
        </box>
      </scrolledwindow>
    </Popup>
  );
}

function BatteryPanel({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  return (
    <Popup
      name="battery"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      width={320}
      attached
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        spacing={12}
        class="panel-content"
      >
        <label
          label={batteryState.as(({ percent }) => `${Math.round(percent)}%`)}
          class="battery-percent"
        />
        <Gtk.ProgressBar
          fraction={batteryState.as(({ percent }) => percent / 100)}
        />
        <box class="info-row">
          <label label="Status" xalign={0} hexpand />
          <label label={batteryState.as(({ state }) => state)} />
        </box>
        <box class="info-row">
          <label
            label={batteryState.as(({ state }) =>
              state === "charging" ? "Fully Charged." : "Remaining time.",
            )}
            xalign={0}
            hexpand
          />
          <label label={batteryState.as(({ time }) => time)} />
        </box>
      </box>
    </Popup>
  );
}

const nearbyWifi = createPoll<
  Array<{ ssid: string; signal: number; security: string }>
>(
  [],
  3000,
  [
    "bash",
    "-lc",
    "nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list --rescan auto 2>/dev/null | head -8",
  ],
  (out) =>
    out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(":");
        return {
          ssid: parts[0],
          signal: Number(parts[1]),
          security: parts.slice(2).join(":"),
        };
      })
      .filter((x) => x.ssid),
);

const bluetoothDevices = createPoll<
  Array<{ mac: string; name: string; connected: boolean }>
>(
  [],
  1500,
  [
    "bash",
    "-lc",
    `bluetoothctl devices 2>/dev/null | while read -r _ mac name; do bluetoothctl info "$mac" 2>/dev/null | grep -q 'Connected: yes' && c=true || c=false; printf '%s|%s|%s\\n' "$mac" "$name" "$c"; done`,
  ],
  (out) =>
    out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [mac, name, connected] = line.split("|");
        return { mac, name, connected: connected === "true" };
      }),
);

function QuickSettings({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  const [confirm, setConfirm] = createState("");
  const [wifiPasswordFor, setWifiPasswordFor] = createState("");
  const [wifiPassword, setWifiPassword] = createState("");
  const [wifiExpanded, setWifiExpanded] = createState(false);
  const [bluetoothExpanded, setBluetoothExpanded] = createState(false);
  const toggleNight = () =>
    fireSh(
      "pgrep -x hyprsunset >/dev/null && pkill -x hyprsunset || hyprsunset -t 4200 >/dev/null 2>&1 &",
    );
  const action = (command: string) => {
    setConfirm("");
    fireSh(command);
  };
  return (
    <Popup
      name="quicksettings"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      width={430}
      height={760}
    >
      <Header title="Quick Settings" />
      <scrolledwindow vexpand class="panel-scroll">
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          class="panel-content"
        >
          <box homogeneous spacing={8}>
            <ActionButton
              icon="󰐥"
              label="Shutdown"
              onClicked={() => setConfirm("shutdown")}
            />
            <ActionButton
              icon="󰜉"
              label="Reboot"
              onClicked={() => setConfirm("reboot")}
            />
            <ActionButton
              icon="󰍃"
              label="Logout"
              onClicked={() => setConfirm("logout")}
            />
            <ActionButton
              icon="󰌾"
              label="Lock"
              onClicked={() => fire(["hyprlock"])}
            />
          </box>
          <box visible={confirm.as(Boolean)} spacing={8} class="confirm-row">
            <label label={confirm.as((v) => `Run?:${v}`)} hexpand />
            <button
              class="gtk-reset text-button danger"
              onClicked={() =>
                action(
                  confirm.peek() === "shutdown"
                    ? "systemctl poweroff"
                    : confirm.peek() === "reboot"
                      ? "systemctl reboot"
                      : "hyprctl dispatch 'hl.dsp.exit()'",
                )
              }
            >
              <label label="Accept" />
            </button>
            <button
              class="gtk-reset text-button"
              onClicked={() => setConfirm("")}
            >
              <label label="Cancel" />
            </button>
          </box>
          <Section title="CONNECTIVITY">
            <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
              <box spacing={6}>
                <button
                  class={connectivity.as(
                    (s) => `gtk-reset setting-tile ${s.wifi ? "active" : ""}`,
                  )}
                  hexpand
                  onClicked={() => {
                    setWifiExpanded((value) => !value);
                    setBluetoothExpanded(false);
                  }}
                >
                  <box spacing={8}>
                    <label label="󰤨" />
                    <label label="Wi-Fi" hexpand xalign={0} />
                    <label
                      label={connectivity.as(
                        (s) => s.ssid || (s.wifi ? "ON" : "OFF"),
                      )}
                      class="text-sm"
                    />
                    <label label={wifiExpanded.as((v) => (v ? "" : ""))} />
                  </box>
                </button>
                <button
                  class={connectivity.as(
                    (s) =>
                      `gtk-reset connectivity-power ${s.wifi ? "active" : ""}`,
                  )}
                  tooltipText="Wi-Fi"
                  onClicked={() =>
                    fire([
                      "nmcli",
                      "radio",
                      "wifi",
                      connectivity.peek().wifi ? "off" : "on",
                    ])
                  }
                >
                  <label label="󰐥" />
                </button>
              </box>
              <box
                visible={wifiExpanded}
                orientation={Gtk.Orientation.VERTICAL}
                spacing={5}
                class="device-list wifi-list"
              >
                <For each={nearbyWifi} id={(network) => network.ssid}>
                  {(network) => (
                    <button
                      class="gtk-reset device-row"
                      onClicked={() => {
                        if (network.security) setWifiPasswordFor(network.ssid);
                        else
                          fire([
                            "nmcli",
                            "device",
                            "wifi",
                            "connect",
                            network.ssid,
                          ]);
                      }}
                    >
                      <box spacing={8}>
                        <label
                          label={
                            network.signal > 65
                              ? "󰤨"
                              : network.signal > 30
                                ? "󰤥"
                                : "󰤟"
                          }
                        />
                        <label label={network.ssid} xalign={0} hexpand />
                        <label label={network.security ? "" : ""} />
                      </box>
                    </button>
                  )}
                </For>
                <box
                  visible={wifiPasswordFor.as(Boolean)}
                  spacing={7}
                  class="wifi-password-row"
                >
                  <Gtk.PasswordEntry
                    hexpand
                    placeholderText={wifiPasswordFor.as(
                      (ssid) => `Password for ${ssid}`,
                    )}
                    onNotifyText={({ text }) => setWifiPassword(text ?? "")}
                  />
                  <button
                    class="gtk-reset text-button"
                    onClicked={() => {
                      const ssid = wifiPasswordFor.peek();
                      const password = wifiPassword.peek();
                      if (ssid && password)
                        fire([
                          "nmcli",
                          "device",
                          "wifi",
                          "connect",
                          ssid,
                          "password",
                          password,
                        ]);
                      setWifiPasswordFor("");
                      setWifiPassword("");
                    }}
                  >
                    <label label="Connect" />
                  </button>
                </box>
              </box>
              <box spacing={6}>
                <button
                  class={connectivity.as(
                    (s) =>
                      `gtk-reset setting-tile ${s.bluetooth ? "active" : ""}`,
                  )}
                  hexpand
                  onClicked={() => {
                    setBluetoothExpanded((value) => !value);
                    setWifiExpanded(false);
                  }}
                >
                  <box spacing={8}>
                    <label label="󰂯" />
                    <label label="Bluetooth" hexpand xalign={0} />
                    <label
                      label={connectivity.as((s) =>
                        s.devices.length
                          ? s.devices.join(", ")
                          : s.bluetooth
                            ? "ON"
                            : "OFF",
                      )}
                      class="text-sm"
                    />
                    <label
                      label={bluetoothExpanded.as((v) => (v ? "" : ""))}
                    />
                  </box>
                </button>
                <button
                  class={connectivity.as(
                    (s) =>
                      `gtk-reset connectivity-power ${s.bluetooth ? "active" : ""}`,
                  )}
                  tooltipText="Bluetooth"
                  onClicked={() =>
                    fire([
                      "bluetoothctl",
                      "power",
                      connectivity.peek().bluetooth ? "off" : "on",
                    ])
                  }
                >
                  <label label="󰐥" />
                </button>
              </box>
              <box
                visible={bluetoothExpanded}
                orientation={Gtk.Orientation.VERTICAL}
                spacing={5}
                class="device-list bluetooth-list"
              >
                <For each={bluetoothDevices} id={(device) => device.mac}>
                  {(device) => (
                    <button
                      class="gtk-reset device-row"
                      onClicked={() =>
                        fire([
                          "bluetoothctl",
                          device.connected ? "disconnect" : "connect",
                          device.mac,
                        ])
                      }
                    >
                      <box spacing={8}>
                        <label label="󰂯" />
                        <label label={device.name} xalign={0} hexpand />
                        <label
                          label={device.connected ? "Disconnect" : "Connect"}
                          class="text-muted"
                        />
                      </box>
                    </button>
                  )}
                </For>
              </box>
            </box>
          </Section>
          <Section title="CONTROLS">
            <box homogeneous spacing={8}>
              <button
                class="gtk-reset icon-setting"
                tooltipText="Night Mode"
                onClicked={toggleNight}
              >
                <label label="󰖔" />
              </button>
              <button
                class={audioState.as(
                  (s) =>
                    `gtk-reset icon-setting ${s.micMuted ? "active-danger" : ""}`,
                )}
                tooltipText="Mic Mute"
                onClicked={() =>
                  fire([
                    "wpctl",
                    "set-mute",
                    "@DEFAULT_AUDIO_SOURCE@",
                    "toggle",
                  ])
                }
              >
                <label label="󰍭" />
              </button>
              <button
                class={audioState.as(
                  (s) =>
                    `gtk-reset icon-setting ${s.muted ? "active-danger" : ""}`,
                )}
                tooltipText="Mute"
                onClicked={() =>
                  fire(["wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
                }
              >
                <label label="󰝟" />
              </button>
              <button
                class="gtk-reset icon-setting"
                tooltipText="Color Picker"
                onClicked={() => fireSh("hyprpicker -a")}
              >
                <label label="󰈊" />
              </button>
            </box>
            <box spacing={10}>
              <label label="󰃠" />
              <slider
                hexpand
                value={brightness}
                min={1}
                max={100}
                step={1}
                onValueChanged={({ value }) =>
                  fire(["brightnessctl", "set", `${Math.round(value)}%`])
                }
              />
            </box>
            <box spacing={10}>
              <label label="󰕾" />
              <slider
                hexpand
                value={audioState.as((s) => s.volume * 100)}
                min={0}
                max={100}
                step={1}
                onValueChanged={({ value }) =>
                  fire([
                    "wpctl",
                    "set-volume",
                    "@DEFAULT_AUDIO_SINK@",
                    `${Math.round(value)}%`,
                  ])
                }
              />
            </box>
          </Section>
          <Section title="ASUS PROFILE">
            <box homogeneous spacing={8}>
              {["Quiet", "Balanced", "Performance"].map((profile) => (
                <button
                  class="gtk-reset profile-button"
                  onClicked={() => {
                    fire(["asusctl", "profile", "set", profile]);
                    fire([
                      "powerprofilesctl",
                      "set",
                      profile === "Quiet"
                        ? "power-saver"
                        : profile.toLowerCase(),
                    ]);
                  }}
                >
                  <label label={profile} />
                </button>
              ))}
            </box>
          </Section>
          <button
            class="gtk-reset chatgpt-launch"
            onClicked={() => openPanel("chatgpt", monitor)}
          >
            <box spacing={10}>
              <label label="󰭹" class="text-xl" />
              <label label="ChatGPT" xalign={0} hexpand class="font-semibold" />
              <label label="󰁔" />
            </box>
          </button>
        </box>
      </scrolledwindow>
    </Popup>
  );
}

function createChatSession() {
  const data = `${GLib.get_user_data_dir()}/ags-shell/chatgpt`;
  const cache = `${GLib.get_user_cache_dir()}/ags-shell/chatgpt`;
  GLib.mkdir_with_parents(data, 0o755);
  GLib.mkdir_with_parents(cache, 0o755);
  const session = WebKit.NetworkSession.new(data, cache);
  session
    .get_cookie_manager()
    .set_persistent_storage(
      `${data}/cookies.sqlite`,
      WebKit.CookiePersistentStorage.SQLITE,
    );
  return session;
}
const chatSession = createChatSession();

function ChatGPTPanel({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  const geometry = gdkmonitor.get_geometry();
  const panelWidth = Math.round(geometry.width / 4);
  const panelHeight = Math.min(
    Math.round(panelWidth * 1.9),
    geometry.height - 64,
  );
  const initialize = (webview: any) => {
    const settings = webview.get_settings();
    settings.set_enable_javascript(true);
    settings.set_enable_webgl(true);
    const load = () => webview.load_uri("https://chatgpt.com/");
    webview.connect("map", () => {
      if (!webview.get_uri()) load();
    });
    webview.connect("web-process-terminated", () => setTimeout(load, 250));
    load();
  };
  return (
    <Popup
      name="chatgpt"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      side="left"
      width={panelWidth}
      height={panelHeight}
      class="chatgpt-popup"
    >
      <Header title="ChatGPT Web" />
      <WebKit.WebView
        networkSession={chatSession}
        visible
        vexpand
        hexpand
        $={initialize}
      />
    </Popup>
  );
}

type AppEntry = { name: string; id: string };
const applications = createPoll<AppEntry[]>(
  [],
  30000,
  [
    "bash",
    "-lc",
    `for f in /usr/share/applications/*.desktop "$HOME"/.local/share/applications/*.desktop; do [ -r "$f" ] || continue; n=$(sed -n 's/^Name=//p' "$f" | head -1); h=$(sed -n 's/^NoDisplay=//p' "$f" | head -1); [ -n "$n" ] && [ "$h" != true ] && printf '%s|%s\\n' "$n" "$(basename "$f" .desktop)"; done | sort -fu | head -120`,
  ],
  (out) =>
    out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const split = line.lastIndexOf("|");
        return { name: line.slice(0, split), id: line.slice(split + 1) };
      }),
);

function Launcher({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  const [query, setQuery] = createState("");
  const matches = applications.as((apps) =>
    apps
      .filter((app) => app.name.toLowerCase().includes(query().toLowerCase()))
      .slice(0, 12),
  );
  return (
    <Popup
      name="launcher"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      side="center"
      width={520}
      height={600}
    >
      <Header title="Applications" />
      <Gtk.SearchEntry
        placeholderText="Search…"
        class="launcher-search"
        onSearchChanged={({ text }) => setQuery(text ?? "")}
      />
      <scrolledwindow vexpand>
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={5}
          class="panel-content"
        >
          <For each={matches} id={(item) => item.id}>
            {(item) => (
              <button
                class="gtk-reset launcher-row"
                onClicked={() => {
                  fire(["gtk-launch", item.id]);
                  closePanels();
                }}
              >
                <box>
                  <label label={item.name} xalign={0} hexpand />
                  <label label="󰁔" />
                </box>
              </button>
            )}
          </For>
        </box>
      </scrolledwindow>
    </Popup>
  );
}

const clipboardItems = createPoll<string[]>(
  [],
  2000,
  ["bash", "-lc", "cliphist list 2>/dev/null | head -80"],
  (out) => out.split("\n").filter(Boolean),
);
function ClipboardPanel({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  return (
    <Popup
      name="clipboard"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      side="center"
      width={560}
      height={620}
    >
      <Header title="Clipboard" />
      <scrolledwindow vexpand>
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={5}
          class="panel-content"
        >
          <For each={clipboardItems}>
            {(item) => (
              <button
                class="gtk-reset clipboard-row"
                onClicked={() => {
                  fireSh(
                    `printf '%s' '${item.replaceAll("'", "'\\''")}' | cliphist decode | wl-copy`,
                  );
                  closePanels();
                }}
              >
                <label
                  label={item.replace(/^\d+\s+/, "")}
                  xalign={0}
                  maxWidthChars={65}
                  ellipsize={3}
                />
              </button>
            )}
          </For>
        </box>
      </scrolledwindow>
    </Popup>
  );
}

type ShortcutBind = { keys: string[]; desc: string };
type ShortcutSection = { section: string; binds: ShortcutBind[] };

function Cheatsheet({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  const [shortcutSections, setShortcutSections] =
    createState<ShortcutSection[]>([]);
  const [selectedSection, setSelectedSection] = createState("Applications");
  const loadShortcutSections = async () => {
    const out = await sh(`python3 '${SRC}/scripts/parse_keybinds.py'`);
    try {
      const sections = JSON.parse(out) as ShortcutSection[];
      setShortcutSections(sections);
      if (!sections.some((section) => section.section === selectedSection())) {
        setSelectedSection(sections[0]?.section ?? "");
      }
    } catch (error) {
      console.error("Failed to parse Hyprland keybinds", error);
    }
  };
  const selectedBinds = shortcutSections.as((sections) => {
    const selected = sections.find(
      (section) => section.section === selectedSection(),
    );
    return selected?.binds ?? sections[0]?.binds ?? [];
  });

  return (
    <Popup
      name="cheatsheet"
      monitor={monitor}
      gdkmonitor={gdkmonitor}
      side="center"
      width={850}
      height={550}
    >
      <Header title="Keyboard Shortcuts" />
      <box
        class="cheatsheet-layout"
        vexpand
        $={(self) =>
          self.connect("map", () => {
            void loadShortcutSections();
          })
        }
      >
        <scrolledwindow class="cheatsheet-sidebar" vexpand>
          <box orientation={Gtk.Orientation.VERTICAL} spacing={3}>
            <label
              label="Categories"
              xalign={0}
              class="cheatsheet-sidebar-title"
            />
            <For each={shortcutSections} id={(section) => section.section}>
              {(section) => (
                <button
                  class={selectedSection.as((selected) =>
                    selected === section.section
                      ? "gtk-reset shortcut-category active"
                      : "gtk-reset shortcut-category",
                  )}
                  onClicked={() => setSelectedSection(section.section)}
                >
                  <box>
                    <label label={section.section} xalign={0} hexpand />
                    <label
                      label={String(section.binds.length)}
                      class="shortcut-category-count"
                    />
                  </box>
                </button>
              )}
            </For>
          </box>
        </scrolledwindow>
        <Gtk.Separator orientation={Gtk.Orientation.VERTICAL} />
        <scrolledwindow class="cheatsheet-binds" hexpand vexpand>
          <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <For
              each={selectedBinds}
              id={(bind) => `${bind.keys.join("+")}-${bind.desc}`}
            >
              {(bind) => (
                <box class="shortcut-row">
                  <label label={bind.desc} xalign={0} hexpand />
                  <label
                    label={bind.keys.join(" + ")}
                    class="shortcut-keys"
                  />
                </box>
              )}
            </For>
          </box>
        </scrolledwindow>
      </box>
    </Popup>
  );
}

function NotificationToast({
  monitor,
  gdkmonitor,
}: {
  monitor: number;
  gdkmonitor: any;
}) {
  const notifd = Notifd.get_default();
  const [summary, setSummary] = createState("");
  const [body, setBody] = createState("");
  let window: any = null;
  let timeoutId: any = null;
  notifd.connect("notified", (_, id) => {
    const focusedConnector = Hyprland.get_default()
      .get_focused_monitor()
      ?.get_name();
    if (focusedConnector && gdkmonitor.get_connector() !== focusedConnector)
      return;
    const notification = notifd.get_notification(id);
    if (!notification || notifd.dontDisturb) return;
    setSummary(notification.summary || notification.appName);
    setBody(notification.body || "");
    window.visible = true;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      window.visible = false;
    }, 6000);
  });
  return (
    <window
      name={`toast-${monitor}`}
      namespace={`ags-toast-${monitor}`}
      application={app}
      visible={false}
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      marginTop={50}
      marginRight={12}
      $={(self) => {
        window = self;
      }}
    >
      <button
        class="gtk-reset notification-toast"
        onClicked={() => {
          window.visible = false;
          openPanel("notifications", monitor);
        }}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label label={summary} xalign={0} class="font-semibold" />
          <label
            label={body}
            xalign={0}
            maxWidthChars={42}
            ellipsize={3}
            class="text-sm text-muted"
          />
        </box>
      </button>
    </window>
  );
}

export function Panels(monitor: number, gdkmonitor: any) {
  Dashboard({ monitor, gdkmonitor });
  CalendarPanel({ monitor, gdkmonitor });
  MediaPanel({ monitor, gdkmonitor });
  NotificationsPanel({ monitor, gdkmonitor });
  BatteryPanel({ monitor, gdkmonitor });
  QuickSettings({ monitor, gdkmonitor });
  ChatGPTPanel({ monitor, gdkmonitor });
  Launcher({ monitor, gdkmonitor });
  ClipboardPanel({ monitor, gdkmonitor });
  Cheatsheet({ monitor, gdkmonitor });
  NotificationToast({ monitor, gdkmonitor });
}
