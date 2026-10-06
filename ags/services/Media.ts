import Mpris from "gi://AstalMpris";

export interface MediaInfo {
  player: Mpris.Player | null;
  title: string;
  artist: string;
  identity: string;
  coverArt: string;
  playing: boolean;
}
const empty: MediaInfo = { player: null, title: "No media playing", artist: "", identity: "", coverArt: "", playing: false };
let current = empty;
let mpris: Mpris.Mpris | null = null;
let playersSignal = 0;
const playerSignals = new Map<Mpris.Player, number[]>();
const listeners = new Set<(info: MediaInfo) => void>();

function sync() {
  const players = mpris?.get_players().filter(player => player.get_available()) || [];
  const playing = players.filter(player => player.get_playback_status() === Mpris.PlaybackStatus.PLAYING);
  const player = playing.includes(current.player!) ? current.player
    : playing[0] || (players.includes(current.player!) ? current.player : players[0]) || null;
  current = player ? { player, title: player.get_title() || "Unknown title", artist: player.get_artist() || "",
    identity: player.get_identity() || "", coverArt: player.get_cover_art() || "",
    playing: player.get_playback_status() === Mpris.PlaybackStatus.PLAYING } : empty;
  listeners.forEach(listener => listener(current));
}
function connectPlayers() {
  const players = mpris!.get_players();
  for (const [player, signals] of playerSignals) {
    if (!players.includes(player)) {
      signals.forEach(id => player.disconnect(id)); playerSignals.delete(player);
    }
  }
  for (const player of players) {
    if (playerSignals.has(player)) continue;
    playerSignals.set(player, ["title", "artist", "identity", "cover-art", "playback-status", "available",
      "can-play", "can-pause", "can-go-next", "can-go-previous"].map(
      property => player.connect(`notify::${property}`, sync)));
  }
  sync();
}
// D-Bus property changes drive both the bar and panel; no polling or position timer.
export function watchMedia(listener: (info: MediaInfo) => void): () => void {
  listeners.add(listener);
  if (!mpris) {
    mpris = Mpris.get_default();
    playersSignal = mpris.connect("notify::players", connectPlayers);
    connectPlayers();
  } else listener(current);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && mpris) {
      mpris.disconnect(playersSignal); playersSignal = 0;
      for (const [player, signals] of playerSignals) signals.forEach(id => player.disconnect(id));
      playerSignals.clear(); mpris = null; current = empty;
    }
  };
}
