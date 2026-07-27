# Waybar メディアプレイヤー機能の追加

## 追加された機能

`waybar_now`フォルダに音楽再生情報を表示する機能を追加しました。

## 新しいファイル

1. **scripts/mediaplayer.py** - Pythonベースのメディアプレイヤースクリプト（JSON出力）
2. **scripts/mediaplayer.sh** - Bashベースの代替スクリプト（シンプル版）

## 設定の変更

### config
- `modules-left`に`custom/media`を追加
- `custom/media`モジュールの設定を追加

### style.css
- メディアプレイヤーのスタイリングを追加
- 再生状態に応じた色分け（Playing=緑、Paused=オレンジ、Stopped=グレー）

## 操作方法

- **左クリック**: 再生/一時停止
- **右クリック**: 次の曲
- **スクロールアップ**: 前の曲
- **スクロールダウン**: 次の曲

## 表示内容

- 再生中: ` アーティスト名 - 曲名`
- 一時停止: ` アーティスト名 - 曲名`
- 停止/非再生: 何も表示しない

## 必要なパッケージ

```bash
sudo pacman -S playerctl
```

## 使用方法

### Pythonスクリプト使用（推奨）
デフォルトで設定されています。JSON形式で出力し、ツールチップやクラス分けに対応。

### Bashスクリプト使用（代替）
よりシンプルな実装です。configで以下のように変更:

```json
"custom/media": {
    "exec": "~/.config/waybar/scripts/mediaplayer.sh",
    "interval": 2,
    "max-length": 50,
    "format": "{}",
    "on-click": "playerctl play-pause",
    "on-click-right": "playerctl next"
}
```

## トラブルシューティング

### 何も表示されない
```bash
# playerctlの確認
playerctl status

# スクリプトの手動実行
~/.config/waybar/scripts/mediaplayer.py
~/.config/waybar/scripts/mediaplayer.sh
```

### 対応プレイヤー
- Spotify
- VLC
- Firefox (メディア再生時)
- Chrome/Chromium (メディア再生時)
- mpv
- その他MPRIS対応プレイヤー

## Waybarの再起動

設定を反映するには:

```bash
pkill waybar; waybar &
```

または

```bash
killall waybar && waybar &
```
