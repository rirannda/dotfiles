#!/bin/bash
# Media player next button with status

status=$(playerctl status 2>/dev/null)

case "$status" in
    "Playing")
        echo '{"text":"󰒭","class":"playing","alt":"Next"}'
        ;;
    "Paused")
        echo '{"text":"󰒭","class":"paused","alt":"Next"}'
        ;;
    *)
        echo '{"text":"󰒭","class":"stopped","alt":"Next"}'
        ;;
esac
