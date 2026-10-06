#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/config-common.sh"
config_only=false
if [[ "${1:-}" == "--config-only" ]]; then
  config_only=true
  shift
fi
if [[ $# -gt 0 ]]; then
  selected=("$@")
  for name in "${selected[@]}"; do
    valid=0
    for allowed in "${CONFIG_NAMES[@]}"; do [[ "$name" != "$allowed" ]] || valid=1; done
    [[ "$valid" == 1 && -d "$DOTFILES_DIR/$name" ]] || { printf 'Invalid or missing config: %s\n' "$name" >&2; exit 1; }
  done
else
  selected=("${CONFIG_NAMES[@]}")
  if [[ "$config_only" == false ]]; then
    replace_entry "$DOTFILES_DIR/.zprofile" "$HOME/.zprofile" home/.zprofile
    replace_entry "$DOTFILES_DIR/.zshrc" "$HOME/.zshrc" home/.zshrc
  fi
  replace_entry "$DOTFILES_DIR/starship/starship.toml" "$CONFIG_DIR/starship.toml" config/starship.toml
fi
for name in "${selected[@]}"; do
  replace_entry "$DOTFILES_DIR/$name" "$CONFIG_DIR/$name" "config/$name"
done
printf 'Backup: %s\n' "$BACKUP_DIR"
