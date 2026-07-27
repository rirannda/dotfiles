#!/bin/bash

# ネットワークマネージャでWi-Fi一覧取得
wifi_list=$(nmcli -t -f SSID,SECURITY dev wifi list | awk -F: '{print $1 " (" $2 ")"}' | sort -u
)

# Rofi で選択
chosen=$(echo "$wifi_list" | rofi -dmenu -p "Select Wi-Fi:")

# 選択された場合
if [ -n "$chosen" ]; then
    # Wi-Fi接続（パスワードが必要な場合は自動で聞かれる）
    nmcli dev wifi connect "$chosen"
fi
