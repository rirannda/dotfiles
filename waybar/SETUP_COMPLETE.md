# Waybar 設定完了

## ✅ セットアップ完了

waybar_nowの内容を`~/.config/waybar/`にコピーし、すべてのスクリプトを有効化しました。

## 📁 コピーされたファイル

```
~/.config/waybar/
├── config                      # メイン設定ファイル
├── style.css                   # スタイルシート
├── MEDIA_README.md            # メディアプレイヤー機能のドキュメント
├── restart-waybar.sh          # Waybar再起動スクリプト（新規追加）
└── scripts/
    ├── bt_status.sh           # Bluetooth状態表示
    ├── fan.sh                 # ファン制御
    ├── fanmode.sh             # ファンモード切り替え
    ├── mediaplayer.py         # メディアプレイヤー情報（JSON出力）★
    ├── mediaplayer.sh         # メディアプレイヤー情報（シンプル版）★
    ├── volume.sh              # 音量制御
    ├── wifi.sh                # WiFi接続
    └── wifinew.sh             # WiFi新規接続
```

★ = 新しく追加されたファイル

## 🎵 メディアプレイヤー機能

### 表示位置
バーの**左側**、ウィンドウタイトルの横に表示されます。

### 表示内容
- 再生中: ` アーティスト名 - 曲名` （緑色）
- 一時停止: ` アーティスト名 - 曲名` （オレンジ色）
- 停止時: 何も表示されない

### 操作方法
- **左クリック**: 再生/一時停止
- **右クリック**: 次の曲
- **スクロールアップ**: 前の曲
- **スクロールダウン**: 次の曲

## 🚀 Waybar操作

### 起動
```bash
waybar &
```

### 再起動
```bash
pkill waybar; waybar &
```

または便利スクリプトを使用:
```bash
~/.config/waybar/restart-waybar.sh
```

### 設定再読み込み
```bash
killall -SIGUSR2 waybar
```

## 🔧 トラブルシューティング

### メディア情報が表示されない場合

1. playerctlが動作しているか確認:
```bash
playerctl status
playerctl metadata
```

2. スクリプトを手動実行:
```bash
~/.config/waybar/scripts/mediaplayer.py
```

3. 対応しているメディアプレイヤーを使用しているか確認:
   - Spotify
   - Firefox (動画/音楽再生時)
   - Chrome/Chromium (動画/音楽再生時)
   - VLC
   - mpv
   - その他MPRIS対応プレイヤー

### デバッグモードで起動
```bash
waybar -l debug
```

## 📝 カスタマイズ

### 表示位置を変更
`config`ファイルで`"custom/media"`の位置を変更:

```json
"modules-left": ["hyprland/window", "custom/media"],
```

を

```json
"modules-center": ["cpu", "custom/media", "hyprland/workspaces"],
```

などに変更可能。

### 更新間隔を変更
`config`の`custom/media`セクション:

```json
"interval": 2,  // 2秒ごとに更新（1-10推奨）
```

### 最大文字数を変更
```json
"max-length": 50,  // 50文字まで表示
```

## 🎨 スタイルのカスタマイズ

`style.css`で色やスタイルを変更:

```css
#custom-media.playing {
    color: #a6e3a1;  /* 再生中の色（緑） */
}

#custom-media.paused {
    color: #fab387;  /* 一時停止の色（オレンジ） */
}
```

## 💡 ヒント

- メディアプレイヤーの情報は、音楽再生開始から数秒で表示されます
- ツールチップ（マウスホバー）で詳細情報を確認できます
- スクロールで素早く曲送り/曲戻しができます

設定は完了しました！音楽を再生してお楽しみください 🎵
