#!/bin/bash
# シンプルなメディアプレイヤー情報表示スクリプト（playerctlなしでも動作）

# playerctlが利用可能かチェック
if ! command -v playerctl &> /dev/null; then
    echo ""
    exit 0
fi

# ステータス取得
STATUS=$(playerctl status 2>/dev/null)

if [ $? -ne 0 ]; then
    # プレイヤーが起動していない
    echo ""
    exit 0
fi

# アーティストとタイトル取得
ARTIST=$(playerctl metadata artist 2>/dev/null)
TITLE=$(playerctl metadata title 2>/dev/null)

# アイコン選択
case "$STATUS" in
    "Playing")
        ICON=""
        ;;
    "Paused")
        ICON=""
        ;;
    *)
        ICON=""
        ;;
esac

# テキスト整形
if [ -n "$ARTIST" ] && [ -n "$TITLE" ]; then
    TEXT="$ARTIST - $TITLE"
elif [ -n "$TITLE" ]; then
    TEXT="$TITLE"
else
    TEXT=""
fi

# 最大長制限（50文字）
if [ ${#TEXT} -gt 47 ]; then
    TEXT="${TEXT:0:47}..."
fi

# 出力
if [ -n "$TEXT" ]; then
    echo "$ICON $TEXT"
else
    echo ""
fi
