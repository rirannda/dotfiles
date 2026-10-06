#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export AGS_CONFIG_DIR="$(cd -- "$script_dir/.." && pwd)"
config_root="$(dirname -- "$AGS_CONFIG_DIR")"
export AGS_HYPR_CONFIG_DIR="$config_root/hypr"
export MATUGEN_CONFIG_FILE="${MATUGEN_CONFIG_FILE:-$config_root/matugen/config.toml}"
export AGS_WALLPAPER_DIR="${AGS_WALLPAPER_DIR:-$HOME/Wallpapers}"
# Layer-shell windows must use the compositor even when launched from an X11 app.
export GDK_BACKEND=wayland
mkdir -p "$AGS_WALLPAPER_DIR"

if ! awww query >/dev/null 2>&1; then
    if ! pgrep -x awww-daemon >/dev/null; then
        awww-daemon --format xrgb &
    fi
    for ((attempt = 0; attempt < 30; attempt++)); do
        if awww query >/dev/null 2>&1; then break; fi
        sleep 0.1
    done
fi
exec ags run "$AGS_CONFIG_DIR/app.tsx" "$@"
