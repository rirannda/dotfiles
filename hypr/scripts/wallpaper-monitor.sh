#!/usr/bin/env bash
set -euo pipefail
socket="${XDG_RUNTIME_DIR:?}/hypr/${HYPRLAND_INSTANCE_SIGNATURE:?}/.socket2.sock"
socat -U - "UNIX-CONNECT:$socket" | while IFS= read -r event; do
    case "$event" in
        monitoradded\>\>*)
            sleep 1
            current="$(awww query | sed -n 's/.*image: //p' | head -n 1)"
            if [[ -n "$current" && -f "$current" ]]; then
                awww img "$current"
            fi
            ;;
    esac
done
