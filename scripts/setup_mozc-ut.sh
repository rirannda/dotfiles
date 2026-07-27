#!/bin/zsh
set -e

echo "========================================"
echo "  Build: fcitx5-mozc + UT Dictionary"
echo "========================================"

WORK_DIR="/tmp/fcitx5-mozc-ut-build"
MERGE_DIR="$WORK_DIR/merge-ut-dictionaries"
MOZC_DIR="$WORK_DIR/fcitx5-mozc"

echo "==> Checking required packages (git, base-devel)..."
sudo pacman -S --needed --noconfirm git base-devel

echo "==> Preparing working directory ($WORK_DIR)..."
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# 1. Download and run UT dictionary merge script
echo "==> Downloading merge-ut-dictionaries..."
git clone --depth 1 https://github.com/utuhiro78/merge-ut-dictionaries.git "$MERGE_DIR"

echo "==> Generating UT dictionary (This may take a few minutes)..."
cd "$MERGE_DIR/src/merge"
sh make.sh
UT_DICT_TXT="$MERGE_DIR/src/merge/mozcdic-ut.txt"

if [ ! -f "$UT_DICT_TXT" ]; then
  echo "Error: Failed to generate UT dictionary."
  exit 1
fi
echo "==> Successfully generated UT dictionary."

# 2. Get official PKGBUILD and extract source
echo "==> Fetching fcitx5-mozc PKGBUILD..."
cd "$WORK_DIR"
yay -G fcitx5-mozc
cd "$MOZC_DIR"

echo "==> Extracting source files..."
makepkg -od --noconfirm

# 3. Merge dictionary data
echo "==> Merging UT dictionary into default dictionary..."
cat "$UT_DICT_TXT" >>src/mozc/src/data/dictionary_oss/dictionary00.txt

# 4. Compile and generate package
echo "==> Compiling and generating package (This will take a while)..."
# -e: use extracted source, --skipinteg: ignore checksum error caused by dictionary injection
makepkg -e --noconfirm --skipinteg

# 5. Install the generated package using pacman
echo "==> Installing the generated package via pacman..."
sudo pacman -U --noconfirm *.pkg.tar.zst

echo "========================================"
echo "Done! fcitx5-mozc (UT dict integrated) has been installed."
echo "Please reboot or re-login to apply changes."
echo "========================================"
