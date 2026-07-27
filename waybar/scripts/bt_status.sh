#!/bin/bash

# 接続中のデバイス一覧取得
mapfile -t macs < <(bluetoothctl devices Connected | awk '{print $2}')

if [ ${#macs[@]} -eq 0 ]; then
    # 接続デバイスなし
    icon="󰂲"
    tooltip="No device connected"
else
    # アイコンは接続中を代表する1つを表示（例: 最初のデバイス）
    first_mac=${macs[0]}
    battery=$(bluetoothctl info "$first_mac" | grep "Battery Percentage" | awk '{print $3}' | tr -d '()')
    if [ -n "$battery" ]; then
        if [ "$battery" -ge 80 ]; then icon="󰥈"
        elif [ "$battery" -ge 60 ]; then icon="󰥄"
        elif [ "$battery" -ge 40 ]; then icon="󰥂"
        elif [ "$battery" -ge 20 ]; then icon="󰤿"
        else icon="󰤾"
        fi
    else
        icon=""
    fi

    # tooltipに全デバイス情報をまとめる
    tooltip=""
    for mac in "${macs[@]}"; do
        name=$(bluetoothctl info "$mac" | grep "Name" | awk '{print $2}')
        codec=$(pactl list sinks | grep -A 20 bluez_output | grep "$mac" | grep "Active Profile" | awk -F ' ' '{print $3}' | head -n 1)
        battery=$(bluetoothctl info "$mac" | grep "Battery Percentage" | awk '{print $3}' | tr -d '()')
        tooltip+="$name | Codec: ${codec:-N/A} | Battery: ${battery:-N/A}%\n"
    done
    # 最後の改行を削除
    tooltip=${tooltip%\\n}
fi

# Waybar用JSON出力
echo "{\"text\": \"$icon\", \"tooltip\": \"$tooltip\"}"
