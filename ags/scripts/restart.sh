#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ags quit -i ags-shell || true
exec "$script_dir/launch.sh"
