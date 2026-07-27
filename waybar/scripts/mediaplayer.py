#!/usr/bin/env python3
"""
Media player script for Waybar
Shows currently playing media from playerctl
"""
import json
import subprocess
import sys
import html

def get_player_status():
    
    try:
        # Get player status
        status = subprocess.check_output(
            ["playerctl", "status"],
            stderr=subprocess.DEVNULL
        ).decode("utf-8").strip()
        
        # Get metadata
        artist = subprocess.check_output(
            ["playerctl", "metadata", "artist"],
            stderr=subprocess.DEVNULL
        ).decode("utf-8").strip()
        
        title = subprocess.check_output(
            ["playerctl", "metadata", "title"],
            stderr=subprocess.DEVNULL
        ).decode("utf-8").strip()
        
        # Escape special characters for Pango markup
        artist = html.escape(artist) if artist else ""
        title = html.escape(title) if title else ""
        
        # Get player name to identify YouTube
        try:
            player_name = subprocess.check_output(
                ["playerctl", "metadata", "playerName"],
                stderr=subprocess.DEVNULL
            ).decode("utf-8").strip()
        except:
            player_name = ""
        
        # Format output based on available metadata
        if artist and title:
            # YouTube Music, Spotify など
            text = f"{artist} - {title}"
        elif title:
            # YouTube動画など（artistがない場合）
            text = title
        else:
            text = ""
        
        # Create tooltip with more info
        if artist and title:
            tooltip_text = f"{status}: {artist} - {title}"
        elif title:
            tooltip_text = f"{status}: {title}"
        else:
            tooltip_text = ""
        
        # Add player name to tooltip
        if player_name:
            tooltip_text += f"\n({player_name})"
        
        output = {
            "text": text if text else "",
            "tooltip": tooltip_text,
            "class": status.lower(),
            "alt": status
        }
        
        print(json.dumps(output))
        
    except subprocess.CalledProcessError:
        # No player running
        print(json.dumps({"text": "No media playing", "tooltip": "No media player", "class": "stopped", "alt": "Stopped"}))
    except Exception as e:
        print(json.dumps({"text": "", "tooltip": str(e), "class": "error", "alt": "Error"}), file=sys.stderr)

if __name__ == "__main__":
    get_player_status()
