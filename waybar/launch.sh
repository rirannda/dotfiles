#!/usr/bin/env bash
# ~/.config/waybar/launch.sh
# 上バーと左バーを同時に起動するラッパー
# Hyprland・niri どちらでも動作する
#
# 使い方:
#   hyprland.conf / config.kdl の spawn-at-startup から waybar の代わりに呼ぶ:
#     Hyprland: exec-once = ~/.config/waybar/launch.sh
#     niri:     spawn-at-startup "bash" "-c" "~/.config/waybar/launch.sh"

# 既存のwaybarを全部落とす（再起動時の二重起動防止）
pkill waybar
sleep 0.5

WAYBAR_DIR="$HOME/.config/waybar"

# 上バー（既存config.jsonc）
waybar -c "$WAYBAR_DIR/config.jsonc" &

wait
