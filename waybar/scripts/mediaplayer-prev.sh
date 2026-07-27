#!/bin/bash
# Media player previous button with status

status=$(playerctl status 2>/dev/null)

case "$status" in
    "Playing")
        echo '{"text":"󰒮","class":"playing","alt":"Previous"}'
        ;;
    "Paused")
        echo '{"text":"󰒮","class":"paused","alt":"Previous"}'
        ;;
    *)
        echo '{"text":"󰒮","class":"stopped","alt":"Previous"}'
        ;;
esac
