#!/usr/bin/env bash
set -euo pipefail

mode="${1:-area}"
directory="${XDG_PICTURES_DIR:-$HOME/Pictures}/Screenshots"
mkdir -p "$directory"
target="$directory/$(date +'%Y-%m-%d_%H-%M-%S').png"

case "$mode" in
  full)
    grim "$target"
    ;;
  window)
    geometry="$(hyprctl -j activewindow | jq -r '(.at | join(",")) + " " + (.size | join("x"))')"
    [ -n "$geometry" ] && [ "$geometry" != "null null" ]
    grim -g "$geometry" "$target"
    ;;
  area)
    geometry="$(slurp)"
    [ -n "$geometry" ]
    grim -g "$geometry" "$target"
    ;;
  *)
    printf 'usage: %s {full|window|area}\n' "$0" >&2
    exit 2
    ;;
esac

wl-copy < "$target"
notify-send -a "AGS Screenshot" -i "$target" "Screenshot saved" "$target"
