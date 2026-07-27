#!bin/bash

# Change fan profile
asusctl profile -n

# Get corrent fan profile
mode=$(asusctl profile -p)

# Notification by dunst
dunstify "Fan mode changed to " "$mode"
