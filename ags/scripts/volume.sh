#!/usr/bin/env bash
set -euo pipefail
settings_file="${XDG_DATA_HOME:-$HOME/.local/share}/ags/settings.json"
limit="$(python3 - "$settings_file" <<'PY'
import json, math, sys
try:
    value = float(json.load(open(sys.argv[1]))['maxVolume'])
    if not math.isfinite(value) or not 0.01 <= value <= 5:
        raise ValueError('invalid limit')
except (OSError, ValueError, KeyError, TypeError):
    value = 1.0
print(value)
PY
)"
exec wpctl set-volume --limit "$limit" @DEFAULT_AUDIO_SINK@ 5%+
