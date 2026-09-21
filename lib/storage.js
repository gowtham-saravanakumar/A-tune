// Everything here lives in the browser's localStorage, per-device, no
// account and no database — the same "no login" philosophy chatuneplay
// uses for its profile. Good enough for a personal single-user player.

const KEYS = {
  LIKED: "atune.liked.v1",
  HISTORY: "atune.history.v1",
};

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / disabled — fail silently, playback still works
  }
}

export function getLiked() {
  return read(KEYS.LIKED, []);
}

export function isLiked(videoId) {
  return getLiked().some((t) => t.videoId === videoId);
}

export function toggleLiked(track) {
  const liked = getLiked();
  const exists = liked.some((t) => t.videoId === track.videoId);
  const next = exists ? liked.filter((t) => t.videoId !== track.videoId) : [{ ...track, likedAt: Date.now() }, ...liked];
  write(KEYS.LIKED, next);
  return !exists;
}

export function getHistory() {
  return read(KEYS.HISTORY, []);
}

export function pushHistory(track) {
  const history = getHistory().filter((t) => t.videoId !== track.videoId);
  history.unshift({ ...track, playedAt: Date.now() });
  write(KEYS.HISTORY, history.slice(0, 200));
  return history;
}

export function recentArtists(limit = 8) {
  const seen = new Set();
  const out = [];
  for (const t of getHistory()) {
    if (!t.artist || seen.has(t.artist)) continue;
    seen.add(t.artist);
    out.push(t.artist);
    if (out.length >= limit) break;
  }
  return out;
}
