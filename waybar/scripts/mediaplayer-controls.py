#!/usr/bin/env python3
"""
Unified media player controls script for Waybar
Returns all controls with synchronized status
"""
import json
import subprocess
import sys

def get_status():
    try:
        status = subprocess.check_output(
            ["playerctl", "status"],
            stderr=subprocess.DEVNULL
        ).decode("utf-8").strip()
        return status.lower()
    except:
        return "stopped"

def main():
    status = get_status()
    
    # Output format: prev|play|next
    # This will be split by waybar config
    if status == "playing":
        play_icon = ""
    elif status == "paused":
        play_icon = ""
    else:
        play_icon = "󰙧"
    
    output = {
        "text": f"󰙤|{play_icon}|󰙢",
        "class": status,
        "alt": status
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
