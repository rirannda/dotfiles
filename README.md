# My Arch Linux Dotfiles

My personal dotfiles for an Arch Linux setup featuring Hyprland (Wayland), Quickshell, and fully automated setup scripts.

## Installation

**WARNING:** Run this script on a fresh Arch Linux installation at your own risk. Review the scripts before executing.

1. **Clone the repository:**

    ```zsh
      git clone https://github.com/gorirarirannda/dotfiles.git ~/dotfiles
      cd ~/dotfiles
    ```

2. **Run the basic setup script:**
    This will install required packages (via yay), copy configurations to `~/.config`, and configure GRUB / SDDM.

    ```zsh
    ./scripts/setup.sh
    ```

3. **Install Fcitx5-Mozc with UT Dictionary (Optional but Recommended):**
    This script downloads the UT dictionary, merges it, and compiles `fcitx5-mozc` from the AUR. **This process will take some time.**

    ```zsh
    ./scripts/setup_mozc-ut.sh
    ```

## 🛠️ Post-Installation

* Reboot the system to apply GRUB, SDDM, and Wayland configurations.
* Log in to the Hyprland session via SDDM.
