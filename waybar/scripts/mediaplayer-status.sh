#!/bin/bash
# Media player status icon script

status=$(playerctl status 2>/dev/null)

case "$status" in
    "Playing")
        echo '{"text":"󰏥","class":"playing","alt":"Playing"}'
        ;;
    "Paused")
        echo '{"text":"󰐌","class":"paused","alt":"Paused"}'
        ;;
    *)
        echo '{"text":"󰙦","class":"stopped","alt":"Stopped"}'
        ;;
esac
