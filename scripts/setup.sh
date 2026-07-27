#!/bin/zsh
set -e

DOTFILES_DIR="$(cd "$(dirname "${zsh_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$HOME/.config"

echo "========================================"
echo "  Dotfiles Setup Script (Arch Linux)"
echo "========================================"

# 1. Install base tools and yay
echo "==> Installing base tools..."
sudo pacman -S --needed --noconfirm git base-devel curl wget python python-pip zsh zsh-autosuggestions zsh-syntax-highlighting zsh-completions

if ! command -v yay &>/dev/null; then
  echo "==> yay not found. Installing yay..."
  git clone https://aur.archlinux.org/yay.git /tmp/yay
  cd /tmp/yay
  makepkg -si --noconfirm
  cd "$DOTFILES_DIR"
fi

# 2. Restore pacman & AUR packages
echo "==> Restoring pacman packages..."
if [ -f "$DOTFILES_DIR/pacman_native.txt" ]; then
  yay -S --needed --noconfirm - <"$DOTFILES_DIR/pacman_native.txt"
else
  echo "Warning: pacman_native.txt not found. Skipping."
fi

echo "==> Restoring AUR packages..."
if [ -f "$DOTFILES_DIR/pacman_aur.txt" ]; then
  yay -S --needed --noconfirm - <"$DOTFILES_DIR/pacman_aur.txt"
else
  echo "Warning: pacman_aur.txt not found. Skipping."
fi

# 3. Copy configuration files
echo "==> Copying configuration files..."
mkdir -p "$CONFIG_DIR"

echo "Copying .zprofile to $HOME/"
cp "$DOTFILES_DIR/.zprofile" "$HOME/"

echo "Copying .zshrc to $HOME/"
cp "$DOTFILES_DIR/.zshrc" "$HOME/"
source "$HOME/.zshrc"

echo "Copying starship to $CONFIG_DIR/"
cp "$DOTFILES_DIR/starship/starship.toml" "$CONFIG_DIR/"

for app in hypr kitty nvim quickshell waybar wofi wlogout ; do
  if [ -d "$DOTFILES_DIR/$app" ]; then
    echo "Copying $app to $CONFIG_DIR/"
    sudo rm -rf "$CONFIG_DIR/$app"
    sudo cp -r "$DOTFILES_DIR/$app" "$CONFIG_DIR/"
  fi
done

echo "Reloading Hyprland"
hyprctl reload

# ---------------------------------------------------
# 4. Set default shell to Zsh
# ---------------------------------------------------
echo "==> Changing default shell to Zsh..."
if [ "$SHELL" != "/bin/zsh" ]; then
    chsh -s /bin/zsh
fi

# ---------------------------------------------------
# 5. Configure System Settings (GRUB & SDDM)
# ---------------------------------------------------
echo "==> Configuring GRUB and SDDM..."

# --- GRUB Configuration ---
echo "==> Updating /etc/default/grub..."
sudo cp /etc/default/grub /etc/default/grub.bak

# Set GRUB Theme (Asus-Tuf)
sudo sed -i 's|^#GRUB_THEME=.*|GRUB_THEME="/boot/grub/themes/Asus-Tuf/theme.txt"|' /etc/default/grub
sudo sed -i 's|^GRUB_THEME=.*|GRUB_THEME="/boot/grub/themes/Asus-Tuf/theme.txt"|' /etc/default/grub

# Append necessary kernel parameters for AMD/NVIDIA Optimus and Wayland
# (Nouveau blacklist, NVIDIA modeset, AMD backlight control)
KERNEL_PARAMS="amdgpu.backlight=1 nvidia_drm.modeset=1 rd.driver.blacklist=nouveau modprobe.blacklist=nouveau"
if ! grep -q "nvidia_drm.modeset=1" /etc/default/grub; then
  sudo sed -i "s/^GRUB_CMDLINE_LINUX_DEFAULT=\"\(.*\)\"/GRUB_CMDLINE_LINUX_DEFAULT=\"\1 $KERNEL_PARAMS\"/" /etc/default/grub
fi

echo "==> Applying GRUB configuration..."
sudo grub-mkconfig -o /boot/grub/grub.cfg

# --- SDDM Configuration ---
echo "==> Updating SDDM configuration..."
sudo mkdir -p /etc/sddm.conf.d

# conf.d ディレクトリに上書き用の設定ファイル (drop-in) を作成する
cat <<EOF | sudo tee /etc/sddm.conf.d/10-custom.conf >/dev/null
[General]
Numlock=on

[Theme]
Current=silent
EnableAvatars=false
EOF

echo "==> System configuration updated successfully."

echo "========================================"
echo "Done! Basic setup is complete."
echo "Note: Please run build_mozc_ut.sh separately to install fcitx5-mozc with UT dictionary."
echo "========================================"
