// Two algorithms live here:
//
// 1. shuffle(list) — a Fisher-Yates shuffle, then a light pass that stops
//    the same artist appearing twice in a row (Spotify does something
//    similar so a shuffled album doesn't clump). Used for "Shuffle play"
//    on a playlist / liked-songs / search results.
//
// 2. pickRadioTrack(seed, candidates, history) — when the queue runs dry
//    and Radio is on, this scores each candidate against the track that
//    just finished and weighted-randomly picks one, so autoplay doesn't
//    always take the single top result (that would make every session
//    converge to the same handful of songs). "Same artist" and "same
//    year" score higher than a bare "YouTube also showed me this" match,
//    matching the "same song / same artist / same year" behaviour asked
//    for.

export function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Second pass: swap forward any track whose artist matches the one
  // right before it, when a swap candidate exists further down.
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].artist && arr[i].artist === arr[i - 1].artist) {
      const swapWith = arr.findIndex((t, idx) => idx > i && t.artist !== arr[i - 1].artist);
      if (swapWith !== -1) [arr[i], arr[swapWith]] = [arr[swapWith], arr[i]];
    }
  }
  return arr;
}

function scoreCandidate(seed, candidate) {
  let score = 1; // base: YouTube already considers it related
  if (candidate.artist && seed.artist && candidate.artist.toLowerCase() === seed.artist.toLowerCase()) {
    score += 5; // same artist
  }
  if (candidate.year && seed.year && candidate.year === seed.year) {
    score += 3; // same year
  }
  if (candidate.title && seed.title) {
    const a = candidate.title.toLowerCase();
    const b = seed.title.toLowerCase();
    if (a !== b && (a.includes(b.split(" ")[0]) || b.includes(a.split(" ")[0]))) score += 1; // same "song family" (covers/remixes)
  }
  return score;
}

/**
 * Weighted-random pick among the best-scoring, not-recently-played
 * candidates. Returns null if nothing usable is left (caller should
 * widen the search or stop).
 */
export function pickRadioTrack(seed, candidates, recentIds = []) {
  const recent = new Set(recentIds);
  const pool = candidates.filter((c) => c.videoId !== seed.videoId && !recent.has(c.videoId));
  if (pool.length === 0) return null;

  const scored = pool.map((c) => ({ track: c, score: scoreCandidate(seed, c) }));
  const maxScore = Math.max(...scored.map((s) => s.score));
  // Keep candidates within 2 points of the best score, so "same artist"
  // results usually dominate the pool without it being fully deterministic.
  const finalists = scored.filter((s) => s.score >= maxScore - 2);

  const totalWeight = finalists.reduce((sum, f) => sum + f.score, 0);
  let r = Math.random() * totalWeight;
  for (const f of finalists) {
    r -= f.score;
    if (r <= 0) return f.track;
  }
  return finalists[0].track;
}
