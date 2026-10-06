#!/usr/bin/env bash
# Shared by setup, apply-config and copy. No desktop commands or sudo here.
DOTFILES_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}"
CONFIG_NAMES=(ags matugen hypr gtk-3.0 gtk-4.0 kitty nvim waybar wofi wlogout fcitx5 zed)
BACKUP_DIR="${DOTFILES_BACKUP_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/dotfiles-backups/$(date +%Y%m%d-%H%M%S)-$$}"
mkdir -p -m 700 -- "$BACKUP_DIR"

replace_entry() {
  local source="$1" destination="$2" saved="$BACKUP_DIR/$3" staging parked=""
  if [[ ! -e "$source" && ! -L "$source" ]]; then
    printf 'Skip missing: %s\n' "$source"
    return
  fi
  mkdir -p -- "$(dirname -- "$destination")" "$(dirname -- "$saved")"
  [[ ! -e "$saved" && ! -L "$saved" ]] || { printf 'Backup already exists: %s\n' "$saved" >&2; return 1; }
  staging="$(mktemp -d "$(dirname -- "$destination")/.dotfiles-stage.XXXXXX")"
  # Keep symlinks without following their targets; new files belong to this user.
  if ! cp -a --no-preserve=ownership -- "$source" "$staging/item"; then
    printf 'Copy failed. Staged files: %s\n' "$staging" >&2
    return 1
  fi
  if [[ -d "$destination" && ! -L "$destination" && ! -w "$destination" ]]; then
    # A foreign-owned directory cannot move to another parent. Preserve a copy,
    # then rename it within its existing parent without changing its ownership.
    cp -a --no-preserve=ownership -- "$destination" "$saved"
    parked="$(dirname -- "$destination")/.$(basename -- "$destination").before-$(date +%Y%m%d-%H%M%S)-$$"
    mv -- "$destination" "$parked"
    printf '%s\n' "$parked" >> "$BACKUP_DIR/parked-paths.txt"
  elif [[ -e "$destination" || -L "$destination" ]]; then
    mv -- "$destination" "$saved"
  fi
  if ! mv -- "$staging/item" "$destination"; then
    if [[ -n "$parked" ]]; then mv -- "$parked" "$destination"
    elif [[ -e "$saved" || -L "$saved" ]]; then mv -- "$saved" "$destination"; fi
    return 1
  fi
  rmdir -- "$staging"
  printf 'Copied: %s\n' "$destination"
}
