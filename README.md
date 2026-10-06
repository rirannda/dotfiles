# Arch Linux dotfiles

Hyprland with AGS (GTK4), Matugen and standard dark GTK themes.
Matugen generates colors for AGS, Hyprland and hyprlock only.
The AGS configuration includes the bar, quick settings, clipboard, calendar,
notifications, music controls and system usage panel.

## Apply existing files

```bash
./scripts/apply-config.sh
```

This copies the configuration folders and shell files into your home directory.
It backs up replaced entries under `${XDG_STATE_HOME:-$HOME/.local/state}/dotfiles-backups/`.
It replaces directories instead of merging old AGS files and keeps symlink targets intact.
Edit files in this repository, then apply all managed `.config` settings with:

```bash
./scripts/apply-config.sh --config-only
```

This includes Starship and leaves the home shell files alone.
For just the AGS and theme configuration:

```bash
./scripts/apply-config.sh ags matugen hypr gtk-3.0 gtk-4.0
hyprctl reload
```

Restart AGS with Super+Ctrl+R after copying. AGS is started automatically on the
next Hyprland login. Super+M opens music; Super+Shift+M has no binding.

## Save current files

```bash
./scripts/copy.sh
```

Use this only when you intend to replace repository files with live settings.
This saves live settings into this repository and records installed explicit
packages in `pkglist/`. It works from any current directory and includes
AGS, Matugen, GTK3 and GTK4. It does not copy Quickshell.

## Fresh Arch Linux setup

Review `./scripts/setup.sh` before running it. It installs packages from
`pkglist/`, applies configurations, changes the login shell and updates
GRUB and SDDM. Configuration copying uses `apply-config.sh` without sudo.

```bash
./scripts/setup.sh
# Optional Mozc UT dictionary:
./scripts/setup_mozc-ut.sh
```

Core packages: aylurs-gtk-shell-git, libastal-meta, GTK4, matugen, awww,
libgudev, cliphist and wl-clipboard. Music players must support MPRIS.
Keep `ags`, `matugen`, `hypr`, `gtk-3.0` and `gtk-4.0` as sibling directories.
AGS resolves configuration paths from its own launch script.
