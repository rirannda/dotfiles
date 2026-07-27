#!/bin/bash
pactl get-sink-volume @DEFAULT_SINK@ | grep -Po '\d+%' | head -1

