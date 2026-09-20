import { createPoll } from "ags/time";
import { sh } from "../lib/shell";

export type WorkspaceState = { focused: number; used: number[]; title: string };

export const clock = createPoll("--:--", 1000, [
  "env", "LC_TIME=C", "date", "+%H:%M  %a.  %m/%d",
]);

export const workspaceState = createPoll<WorkspaceState>(
  { focused: 1, used: [], title: "Desktop" },
  250,
  async () => {
    try {
      const [workspaces, active, client] = await Promise.all([
        sh("hyprctl -j workspaces"),
        sh("hyprctl -j activeworkspace"),
        sh("hyprctl -j activewindow"),
      ]);
      const ws = JSON.parse(workspaces || "[]") as Array<{ id: number }>;
      const aw = JSON.parse(active || "{}") as { id?: number };
      const ac = JSON.parse(client || "{}") as {
        title?: string;
        class?: string;
      };
      return {
        focused: aw.id ?? 1,
        used: ws.map(({ id }) => id).filter((id) => id >= 1 && id <= 10),
        title: ac.title || ac.class || "Desktop",
      };
    } catch {
      return { focused: 1, used: [], title: "Desktop" };
    }
  },
);

export type SystemStats = {
  cpu: number;
  ram: number;
  disk: number;
  cpuTemp: string;
  gpu: string;
  gpuTemp: string;
  uptime: string;
};

export type HardwareInfo = {
  user: string;
  host: string;
  os: string;
  vendor: string;
  model: string;
  cpu: string;
  gpu: string;
};

export const hardwareInfo = createPoll<HardwareInfo>(
  {
    user: "User",
    host: "Unknown",
    os: "Linux",
    vendor: "",
    model: "Unknown",
    cpu: "Unknown",
    gpu: "Unknown",
  },
  60000,
  async (previous) => {
    const raw = await sh(`
      login_name="$(id -un 2>/dev/null)"
      display_name="$(getent passwd "$login_name" | cut -d: -f5 | cut -d, -f1)"
      [ -n "$display_name" ] || display_name="$login_name"
      printf '%s|||%s|||%s|||%s|||%s|||%s|||%s' \
        "$display_name" \
        "$(cat /proc/sys/kernel/hostname 2>/dev/null)" \
        "$(sed -n 's/^PRETTY_NAME=//p' /etc/os-release 2>/dev/null | tr -d '"')" \
        "$(cat /sys/devices/virtual/dmi/id/sys_vendor 2>/dev/null)" \
        "$(cat /sys/devices/virtual/dmi/id/product_name 2>/dev/null)" \
        "$(lscpu 2>/dev/null | sed -n 's/^Model name:[[:space:]]*//p' | head -1)" \
        "$(lspci 2>/dev/null | sed -n '/VGA compatible controller/s/.*: //p' | paste -sd ' + ' -)"
    `);
    const [user, host, os, vendor, model, cpu, gpu] = raw.split("|||");
    return {
      user: user || previous.user,
      host: host || previous.host,
      os: os || previous.os,
      vendor: vendor || previous.vendor,
      model: model || previous.model,
      cpu: cpu || previous.cpu,
      gpu: gpu || previous.gpu,
    };
  },
);

let previousCpu = { total: 0, idle: 0 };
export const systemStats = createPoll<SystemStats>(
  {
    cpu: 0,
    ram: 0,
    disk: 0,
    cpuTemp: "--",
    gpu: "--",
    gpuTemp: "--",
    uptime: "--",
  },
  2500,
  async (previous) => {
    try {
      const raw = await sh(`
        read _ u n s i w q sq st g gn < /proc/stat
        printf '%s|||%s|||%s|||%s|||%s|||%s' \
          "$((u+n+s+i+w+q+sq+st)) $((i+w))" \
          "$(awk '/MemTotal/{t=$2}/MemAvailable/{a=$2}END{printf "%.1f",(t-a)*100/t}' /proc/meminfo)" \
          "$(df -P / | awk 'NR==2{gsub("%",""); print $5}')" \
          "$(sensors 2>/dev/null | awk '/Tctl:|Package id 0:/{gsub(/[+°C]/,""); print $2; exit}')" \
          "$(nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits 2>/dev/null | head -1)" \
          "$(uptime -p 2>/dev/null | sed 's/^up //')"
      `);
      const lines = raw.split("|||");
      const [total, idle] = (lines[0] || "0 0").split(" ").map(Number);
      const deltaTotal = total - previousCpu.total;
      const deltaIdle = idle - previousCpu.idle;
      const cpu =
        previousCpu.total && deltaTotal
          ? ((deltaTotal - deltaIdle) * 100) / deltaTotal
          : previous.cpu;
      previousCpu = { total, idle };
      const [gpu = "--", gpuTemp = "--"] = (lines[4] || "")
        .split(",")
        .map((s) => s.trim());
      return {
        cpu,
        ram: Number(lines[1]) || 0,
        disk: Number(lines[2]) || 0,
        cpuTemp: lines[3] || "--",
        gpu,
        gpuTemp,
        uptime: lines[5] || "--",
      };
    } catch {
      return previous;
    }
  },
);

export type AudioState = { volume: number; muted: boolean; micMuted: boolean };
export const audioState = createPoll<AudioState>(
  { volume: 0, muted: false, micMuted: false },
  250,
  async (previous) => {
    const output = await sh(
      "wpctl get-volume @DEFAULT_AUDIO_SINK@; wpctl get-volume @DEFAULT_AUDIO_SOURCE@",
    );
    const lines = output.split("\n");
    if (!lines[0]) return previous;
    return {
      volume: Number(lines[0].match(/[0-9.]+/)?.[0] ?? 0),
      muted: lines[0].includes("MUTED"),
      micMuted: lines[1]?.includes("MUTED") ?? false,
    };
  },
);

export const brightness = createPoll(
  0,
  350,
  ["bash", "-lc", "brightnessctl -m 2>/dev/null | cut -d, -f4 | tr -d '%'"],
  (out, prev) => Number(out) || prev,
);

export type BatteryState = { percent: number; state: string; time: string };

function formatBatteryTime(value: string) {
  if (!value) return "--";
  const amount = Number(value.match(/[0-9.]+/)?.[0] ?? 0);
  if (!amount) return value;
  const totalMinutes = value.includes("hour")
    ? Math.round(amount * 60)
    : value.includes("minute")
      ? Math.round(amount)
      : value.includes("second")
        ? Math.max(1, Math.round(amount / 60))
        : 0;
  if (!totalMinutes) return value;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export const batteryState = createPoll<BatteryState>(
  { percent: 0, state: "Unknown", time: "--" },
  2000,
  async (previous) => {
    const raw = await sh(
      `upower -i "$(upower -e | grep BAT | head -1)" 2>/dev/null`,
    );
    if (!raw) return previous;
    const value = (key: string) =>
      raw.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
    const state = value("state");
    const time =
      state === "charging" ? value("time to full") : value("time to empty");
    return {
      percent: Number(value("percentage").replace("%", "")) || 0,
      state,
      time: formatBatteryTime(time),
    };
  },
);

export type Connectivity = {
  wifi: boolean;
  ssid: string;
  signal: number;
  bluetooth: boolean;
  devices: string[];
};
export const connectivity = createPoll<Connectivity>(
  {
    wifi: false,
    ssid: "Not Connected",
    signal: 0,
    bluetooth: false,
    devices: [],
  },
  600,
  async () => {
    const raw = await sh(`
      nmcli -t -f WIFI g 2>/dev/null
      nmcli -t -f active,ssid,signal dev wifi 2>/dev/null | awk -F: '$1=="yes"{print $2"|"$3; exit}'
      bluetoothctl show 2>/dev/null | awk '/Powered:/{print $2}'
      bluetoothctl devices Connected 2>/dev/null | cut -d' ' -f3-
    `);
    const lines = raw.split("\n");
    const [ssid = "Not Connected", strength = "0"] = (lines[1] || "").split(
      "|",
    );
    return {
      wifi: lines[0] === "enabled",
      ssid,
      signal: Number(strength),
      bluetooth: lines[2] === "yes",
      devices: lines.slice(3).filter(Boolean),
    };
  },
);

export type MediaState = {
  player: string;
  status: string;
  title: string;
  artist: string;
  art: string;
};
export const mediaState = createPoll<MediaState>(
  { player: "", status: "Stopped", title: "No music", artist: "", art: "" },
  300,
  async (previous) => {
    const raw = await sh(
      `playerctl -a metadata --format '{{playerName}}|||{{status}}|||{{title}}|||{{artist}}|||{{mpris:artUrl}}' 2>/dev/null || true`,
    );
    if (!raw)
      return {
        player: "",
        status: "Stopped",
        title: "No music",
        artist: "",
        art: "",
      };
    const players = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [player, status, title, artist, art] = line.split("|||");
        return {
          player: player || "",
          status: status || "Stopped",
          title: title || "Unknown",
          artist: artist || "Unknown",
          art: art || "",
        };
      });
    return (
      players.find(({ status }) => status === "Playing") ??
      players.find(({ status }) => status === "Paused") ??
      players[0] ??
      previous
    );
  },
);
