#!/bin/bash
# 現在のモードを取得
mode=$(cat /sys/class/hwmon/hwmon0/fan_mode)

if [ "$1" = "toggle" ]; then
    # モード切替
    case "$mode" in
        quiet) new=balance ;;
        balance) new=performance ;;
        performance) new=quiet ;;
    esac
    echo "$new" > /sys/class/hwmon/hwmon0/fan_mode
    notify-send " Fan Mode" "Changed: $new"
fi

echo "$mode"
