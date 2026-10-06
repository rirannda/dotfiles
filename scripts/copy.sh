#!/usr/bin/env bash
# Save live settings to this repository, regardless of the current directory.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/config-common.sh"
replace_entry "$HOME/.zprofile" "$DOTFILES_DIR/.zprofile" repository/.zprofile
replace_entry "$HOME/.zshrc" "$DOTFILES_DIR/.zshrc" repository/.zshrc
replace_entry "$CONFIG_DIR/starship.toml" "$DOTFILES_DIR/starship/starship.toml" repository/starship/starship.toml
for name in "${CONFIG_NAMES[@]}"; do
  replace_entry "$CONFIG_DIR/$name" "$DOTFILES_DIR/$name" "repository/$name"
done
if command -v pacman >/dev/null; then
  mkdir -p -- "$DOTFILES_DIR/pkglist"
  staging="$(mktemp -d "$DOTFILES_DIR/pkglist/.packages.XXXXXX")"
  pacman -Qqen > "$staging/pacman_native.txt"
  pacman -Qqem > "$staging/pacman_aur.txt"
  replace_entry "$staging/pacman_native.txt" "$DOTFILES_DIR/pkglist/pacman_native.txt" repository/pkglist/pacman_native.txt
  replace_entry "$staging/pacman_aur.txt" "$DOTFILES_DIR/pkglist/pacman_aur.txt" repository/pkglist/pacman_aur.txt
  rm -- "$staging/pacman_native.txt" "$staging/pacman_aur.txt"
  rmdir -- "$staging"
fi
printf 'Backup: %s\n' "$BACKUP_DIR"
