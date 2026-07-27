#!/bin/zsh
# dotfilesの設定を最新の設定(動いている設定)に更新するスクリプト

set -e

CONFIG_DIR="$HOME/.config"

cp ~/.zprofile ./
cp ~/.zshrc ./
cp "$CONFIG_DIR/starship.toml" ./starship/
cp "$CONFIG_DIR/hypr/" ./ -r
cp "$CONFIG_DIR/kitty/" ./ -r
cp "$CONFIG_DIR/nvim/" ./ -r
cp "$CONFIG_DIR/quickshell/" ./ -r
cp "$CONFIG_DIR/waybar/" ./ -r
cp "$CONFIG_DIR/wofi/" ./ -r
cp "$CONFIG_DIR/wlogout/" ./ -r
cp "$CONFIG_DIR/fcitx5/" ./ -r

pacman -Qqen > ./pkglist/pacman_native.txt

pacman -Qqem > ./pkglist/pacman_aur.txt