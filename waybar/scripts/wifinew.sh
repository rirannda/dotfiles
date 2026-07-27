#!/bin/bash

# Wi-Fi一覧取得
wifi_list=$(nmcli -t -f SSID,SECURITY dev wifi list | awk -F: '{print $1 " (" $2 ")"}' | sort -u
)

# Rofi で選択
chosen=$(echo "$wifi_list" | rofi -dmenu -p "Connect to Wi-Fi:")

if [ -n "$chosen" ]; then
    # パスワード入力
    password=$(rofi -dmenu -password -p "Password for $chosen:")

    if [ -n "$password" ]; then
        nmcli dev wifi connect "$chosen" password "$password"
    else
        notify-send "Wi-Fi" "No password entered"
    fi
fi
