#!/bin/bash
# Waybar再起動スクリプト

echo "Waybarを再起動しています..."

# 既存のWaybarプロセスを終了
if pgrep -x waybar > /dev/null; then
    echo "既存のWaybarプロセスを終了..."
    pkill waybar
    sleep 1
fi

# Waybarを起動
echo "Waybarを起動..."
waybar &

sleep 2

# 起動確認
if pgrep -x waybar > /dev/null; then
    echo "✓ Waybarが正常に起動しました"
    echo ""
    echo "メディアプレイヤーのテスト:"
    echo "音楽を再生すると、バーの左側に情報が表示されます"
    echo ""
    echo "操作方法:"
    echo "  左クリック: 再生/一時停止"
    echo "  右クリック: 次の曲"
    echo "  スクロール: 曲送り/曲戻し"
else
    echo "✗ Waybarの起動に失敗しました"
    echo "ログを確認してください: waybar -l debug"
fi
