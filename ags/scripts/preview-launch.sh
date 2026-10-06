#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
preview_root="$(cd -- "$script_dir/../.." && pwd)"
original_data="${XDG_DATA_HOME:-$HOME/.local/share}"
original_cache="${XDG_CACHE_HOME:-$HOME/.cache}"
export AGS_CLIPHIST_DB="${AGS_CLIPHIST_DB:-$original_cache/cliphist/db}"
export XDG_DATA_DIRS="$original_data:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"
export XDG_CONFIG_HOME="$preview_root"
export XDG_DATA_HOME="$preview_root/_local-test/data"
export XDG_CACHE_HOME="$preview_root/_local-test/cache"
export AGS_INSTANCE_NAME=ags-preview
export AGS_HYPR_THEME_MODE=runtime
export AGS_WALLPAPER_DIR="${AGS_WALLPAPER_DIR:-$preview_root/ags/wallpapers}"
export MATUGEN_CONFIG_FILE="$preview_root/matugen/config.toml"
mkdir -p "$XDG_DATA_HOME" "$XDG_CACHE_HOME"
exec "$script_dir/launch.sh" "$@"
