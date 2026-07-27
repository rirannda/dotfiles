#!/bin/bash
# Waybar セットアップ完了の確認スクリプト

echo "================================="
echo "  Waybar セットアップ確認"
echo "================================="
echo ""

# ファイルの確認
echo "📁 ファイル確認:"
echo ""

files=(
    "config"
    "style.css"
    "scripts/mediaplayer.py"
    "scripts/mediaplayer.sh"
    "scripts/bt_status.sh"
    "scripts/wifi.sh"
)

for file in "${files[@]}"; do
    if [ -f "$HOME/.config/waybar/$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (見つかりません)"
    fi
done

echo ""
echo "🔧 スクリプト実行権限:"
echo ""

for script in ~/.config/waybar/scripts/*.{py,sh}; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "  ✓ $(basename $script)"
        else
            echo "  ✗ $(basename $script) (実行権限なし)"
        fi
    fi
done

echo ""
echo "📦 必要なパッケージ:"
echo ""

packages=("waybar" "playerctl")
for pkg in "${packages[@]}"; do
    if command -v $pkg &> /dev/null; then
        echo "  ✓ $pkg がインストール済み"
    else
        echo "  ✗ $pkg がインストールされていません"
    fi
done

echo ""
echo "🎵 メディアプレイヤーテスト:"
echo ""

if command -v playerctl &> /dev/null; then
    if ~/.config/waybar/scripts/mediaplayer.py &> /dev/null; then
        echo "  ✓ mediaplayer.py スクリプトが正常に動作"
    else
        echo "  ⚠ mediaplayer.py スクリプトに問題がある可能性"
    fi
    
    PLAYER_STATUS=$(playerctl status 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "  ✓ メディアプレイヤーが実行中: $PLAYER_STATUS"
        playerctl metadata 2>/dev/null | head -3
    else
        echo "  ℹ メディアプレイヤーが実行されていません（音楽を再生すると表示されます）"
    fi
else
    echo "  ✗ playerctl がインストールされていません"
fi

echo ""
echo "🚀 Waybar状態:"
echo ""

if pgrep -x waybar > /dev/null; then
    echo "  ✓ Waybar が実行中"
    echo "  PID: $(pgrep -x waybar)"
else
    echo "  ℹ Waybar が実行されていません"
    echo ""
    echo "  起動するには:"
    echo "    waybar &"
    echo ""
    echo "  または:"
    echo "    ~/.config/waybar/restart-waybar.sh"
fi

echo ""
echo "================================="
echo ""
echo "セットアップは完了しました！"
echo ""
echo "詳細は以下のファイルを参照:"
echo "  ~/.config/waybar/SETUP_COMPLETE.md"
echo "  ~/.config/waybar/MEDIA_README.md"
echo ""
