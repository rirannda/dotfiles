import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createBinding, createState, For } from "ags";
import Tray from "gi://AstalTray";
import Notifd from "gi://AstalNotifd";
import { fire } from "../lib/shell";
import { openTrayMenu } from "../lib/tray";
import {
  registerPanelAnchor,
  togglePanel,
  togglePanelBelow,
} from "../lib/windows";
import {
  audioState,
  batteryState,
  brightness,
  clock,
  connectivity,
  mediaState,
  workspaceState,
} from "../services/polls";

function Workspaces() {
  return (
    <box spacing={4} class="workspaces">
      {Array.from({ length: 10 }, (_, index) => {
        const id = index + 1;
        return (
          <button
            valign={Gtk.Align.CENTER}
            class={workspaceState.as(
              ({ focused, used }) =>
                `gtk-reset workspace ${focused === id ? "focused" : used.includes(id) ? "used" : "unused"}`,
            )}
            tooltipText={`Workspace ${id}`}
            onClicked={() =>
              fire([
                "hyprctl",
                "eval",
                `hl.dispatch(hl.dsp.focus({ workspace = ${id} }))`,
              ])
            }
          >
            <label label={String(id)} />
          </button>
        );
      })}
    </box>
  );
}

function TrayButton({ item }: { item: any }) {
  const initialize = (button: Gtk.MenuButton) => {
    const syncMenu = () => {
      button.menuModel = item.menuModel;
      button.insert_action_group("dbusmenu", item.actionGroup);
    };
    syncMenu();
    item.connect("notify::menu-model", syncMenu);
    item.connect("notify::action-group", syncMenu);

    const primary = new Gtk.GestureClick({
      button: 1,
      propagationPhase: Gtk.PropagationPhase.CAPTURE,
    });
    primary.connect("pressed", (gesture, _press, x, y) => {
      gesture.set_state(Gtk.EventSequenceState.CLAIMED);
      item.activate(Math.round(x), Math.round(y));
    });
    button.add_controller(primary);

    const secondary = new Gtk.GestureClick({
      button: 3,
      propagationPhase: Gtk.PropagationPhase.CAPTURE,
    });
    secondary.connect("pressed", (gesture) => {
      gesture.set_state(Gtk.EventSequenceState.CLAIMED);
      item.about_to_show();
      button.popup();
    });
    button.add_controller(secondary);
  };

  return (
    <menubutton
      class="gtk-reset tray-button"
      tooltipMarkup={createBinding(item, "tooltipMarkup")}
      $={(button) => initialize(button)}
    >
      <image gicon={createBinding(item, "gicon")} pixelSize={16} />
    </menubutton>
  );
}

function SystemTray() {
  const tray = Tray.get_default();
  const items = createBinding(tray, "items").as((all) =>
    (all as any[]).filter(
      (item) => !/discord/i.test(`${item.id} ${item.title}`),
    ),
  );

  return (
    <box spacing={2} class="tray tray-shell">
      <For each={items} id={(item: any) => item.id}>
        {(item) => <TrayButton item={item} />}
      </For>
    </box>
  );
}

function DiscordTray() {
  const tray = Tray.get_default();
  const find = () =>
    (tray.get_items() as any[]).find((item) =>
      /discord/i.test(`${item.id} ${item.title}`),
    ) ?? null;
  const [discord, setDiscord] = createState<any | null>(find());
  tray.connect("item-added", () => setDiscord(find()));
  tray.connect("item-removed", () => setDiscord(find()));
  return (
    <button
      visible={discord.as(Boolean)}
      class="gtk-reset bar-button discord"
      tooltipText="Discord"
      onClicked={() => discord.peek()?.activate(0, 0)}
      $={(button) => {
        const gesture = new Gtk.GestureClick({
          button: 3,
          propagationPhase: Gtk.PropagationPhase.CAPTURE,
        });
        gesture.connect("pressed", () => {
          const item = discord.peek();
          if (item) {
            gesture.set_state(Gtk.EventSequenceState.CLAIMED);
            openTrayMenu(button, item);
          }
        });
        button.add_controller(gesture);
      }}
    >
      <For each={discord.as((item) => (item ? [item] : []))}>
        {(item: any) => (
          <image gicon={createBinding(item, "gicon")} pixelSize={18} />
        )}
      </For>
    </button>
  );
}

function NotificationButton({ monitor }: { monitor: number }) {
  const notifd = Notifd.get_default();
  const [count, setCount] = createState(notifd.get_notifications().length);
  const refresh = () => setCount(notifd.get_notifications().length);
  let icon = count.as((n) => (n === 0 ? "󰂚" : "󱅫"));
  notifd.connect("notified", refresh);
  notifd.connect("resolved", refresh);
  return (
    <button
      class="gtk-reset bar-button notification-button"
      tooltipText="Notifications"
      $={(self) => registerPanelAnchor("notifications", monitor, self, 390)}
      onClicked={(self) =>
        togglePanelBelow("notifications", monitor, self, 390)
      }
    >
      <overlay>
        <label label={icon} />
      </overlay>
    </button>
  );
}

export function Bar(monitor: number, gdkmonitor: any) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;
  const left = (
    <box spacing={7} class="bar-group left-group">
      <button
        class="gtk-reset arch-button"
        tooltipText="Dashboard"
        $={(self) => registerPanelAnchor("dashboard", monitor, self, 650)}
        onClicked={(self) => togglePanelBelow("dashboard", monitor, self, 650)}
      >
        <label label="" />
      </button>
      <Workspaces />
      <label
        label={workspaceState.as(({ title }) => title)}
        maxWidthChars={51}
        ellipsize={3}
        class="active-window"
      />
    </box>
  );
  const center = (
    <button
      class="gtk-reset clock-button"
      $={(self) => registerPanelAnchor("calendar", monitor, self, 340)}
      onClicked={(self) => togglePanelBelow("calendar", monitor, self, 340)}
    >
      <label label={clock} />
    </button>
  );
  const right = (
    <box spacing={4} class="bar-group right-group">
      <button
        class="gtk-reset media-button"
        $={(self) => registerPanelAnchor("media", monitor, self, 390)}
        onClicked={(self) => togglePanelBelow("media", monitor, self, 390)}
      >
        <label
          label={mediaState.as(({ title, artist }) =>
            artist ? `${title} — ${artist}` : title,
          )}
          maxWidthChars={34}
          ellipsize={3}
        />
      </button>
      <SystemTray />
      <DiscordTray />
      <button
        class="gtk-reset bar-button"
        tooltipText="Brightness"
        onClicked={() => togglePanel("quicksettings", monitor)}
      >
        <label label={brightness.as((n) => `󰃠 ${Math.round(n)}%`)} />
      </button>
      <button
        class="gtk-reset bar-button"
        tooltipText="Volume"
        onClicked={() =>
          fire(["wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
        }
      >
        <label
          label={audioState.as(
            ({ volume, muted }) =>
              `${muted ? "󰝟" : volume > 0.5 ? "󰕾" : "󰖀"} ${Math.round(volume * 100)}%`,
          )}
        />
      </button>
      <NotificationButton monitor={monitor} />
      <button
        class="gtk-reset bar-button"
        tooltipText="Battery"
        $={(self) => registerPanelAnchor("battery", monitor, self, 320)}
        onClicked={(self) => togglePanelBelow("battery", monitor, self, 320)}
      >
        <label
          label={batteryState.as(
            ({ percent, state }) =>
              `${Math.round(percent)}% ${state === "charging" ? "󰂄" : percent < 20 ? "󰁺" : "󰁹"}`,
          )}
        />
      </button>
      <button
        class="gtk-reset quick-button"
        tooltipText="Quick Settings"
        onClicked={() => togglePanel("quicksettings", monitor)}
      >
        <label
          label={connectivity.as(
            ({ wifi, signal, bluetooth }) =>
              `${wifi ? (signal > 65 ? "󰤨" : signal > 30 ? "󰤥" : "󰤟") : "󰤭"} ${bluetooth ? "󰂯" : "󰂲"}`,
          )}
        />
      </button>
    </box>
  );

  return (
    <window
      visible
      name={`bar-${monitor}`}
      namespace={`ags-bar-${monitor}`}
      application={app}
      gdkmonitor={gdkmonitor}
      anchor={TOP | LEFT | RIGHT}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
    >
      <centerbox
        class="bar"
        startWidget={left}
        centerWidget={center}
        endWidget={right}
      />
    </window>
  );
}
