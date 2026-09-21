import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { shuffle as shuffleList, pickRadioTrack } from "./queueEngine";
import { enrich } from "./metadata";
import { pushHistory as persistHistory } from "./storage";

const PlayerContext = createContext(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({ children }) {
  const ytPlayerRef = useRef(null); // the window.YT.Player instance, set once by <PlayerHost/>
  const recentIdsRef = useRef([]); // short rolling history, for radio "don't repeat" checks

  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(null); // enriched track or null
  const [queue, setQueue] = useState([]); // upcoming tracks
  const [history, setHistory] = useState([]); // played stack, most-recent last
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [radioOn, setRadioOn] = useState(true); // Spotify-style: autoplay similar tracks once the queue runs out
  const [radioLoading, setRadioLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const registerYtPlayer = useCallback((instance) => {
    ytPlayerRef.current = instance;
    setReady(true);
  }, []);

  const rememberPlayed = useCallback((track) => {
    recentIdsRef.current = [track.videoId, ...recentIdsRef.current].slice(0, 40);
    persistHistory(track);
  }, []);

  const loadIntoPlayer = useCallback((track) => {
    if (!ytPlayerRef.current) return;
    ytPlayerRef.current.loadVideoById(track.videoId);
    setCurrentTime(0);
  }, []);

  /** Play a track right now. `queueAfter`, if given, replaces the upcoming queue. */
  const playNow = useCallback(
    (rawTrack, queueAfter) => {
      const track = enrich(rawTrack);
      setCurrent((prevCurrent) => {
        if (prevCurrent) setHistory((h) => [...h, prevCurrent].slice(-60));
        return track;
      });
      if (queueAfter) setQueue(shuffleOn ? shuffleList(queueAfter) : queueAfter);
      loadIntoPlayer(track);
      rememberPlayed(track);
      setIsPlaying(true);
    },
    [loadIntoPlayer, rememberPlayed, shuffleOn]
  );

  /** Add to the end of the queue without interrupting what's playing. */
  const enqueue = useCallback((rawTrack) => {
    setQueue((q) => [...q, enrich(rawTrack)]);
  }, []);

  /** Insert right after the current track ("Play next"). */
  const playNext = useCallback((rawTrack) => {
    setQueue((q) => [enrich(rawTrack), ...q]);
  }, []);

  const removeFromQueue = useCallback((videoId) => {
    setQueue((q) => q.filter((t) => t.videoId !== videoId));
  }, []);

  /** Shuffle-play an entire list (liked songs, a search result set, etc). */
  const shufflePlayList = useCallback(
    (list) => {
      if (!list.length) return;
      const order = shuffleList(list.map(enrich));
      setShuffleOn(true);
      playNow(order[0], order.slice(1));
    },
    [playNow]
  );

  /** Seed an infinite "radio" from one track — same song / artist / year style continuation. */
  const startRadio = useCallback(
    (rawTrack) => {
      setRadioOn(true);
      playNow(rawTrack, []);
    },
    [playNow]
  );

  const fetchRadioCandidates = useCallback(async (seed) => {
    try {
      const [relatedRes, artistRes] = await Promise.all([
        fetch(`/api/youtube-related?videoId=${encodeURIComponent(seed.videoId)}`).then((r) => r.json()),
        seed.artist
          ? fetch(`/api/youtube-search?q=${encodeURIComponent(seed.artist)}`).then((r) => r.json())
          : Promise.resolve({ results: [] }),
      ]);
      const pool = [...(relatedRes.results || []), ...(artistRes.results || [])].map(enrich);
      // de-dupe
      const seen = new Set();
      return pool.filter((t) => (seen.has(t.videoId) ? false : (seen.add(t.videoId), true)));
    } catch {
      return [];
    }
  }, []);

  // "Advance" (skip to next track) needs to read the *current* queue and
  // current track, not a stale closure — so it's backed by refs kept in
  // sync with state, and implemented once as `realAdvance` below.
  const queueRef = useRef([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const currentRef = useRef(null);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  const radioOnRef = useRef(radioOn);
  useEffect(() => {
    radioOnRef.current = radioOn;
  }, [radioOn]);

  const realAdvance = useCallback(async () => {
    if (queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      setQueue(rest);
      playNow(next);
      return;
    }
    if (radioOnRef.current && currentRef.current) {
      setRadioLoading(true);
      const seed = currentRef.current;
      const candidates = await fetchRadioCandidates(seed);
      const pick = pickRadioTrack(seed, candidates, recentIdsRef.current);
      setRadioLoading(false);
      if (pick) {
        playNow(pick);
        return;
      }
    }
    setIsPlaying(false);
  }, [fetchRadioCandidates, playNow]);

  const back = useCallback(() => {
    if (ytPlayerRef.current?.getCurrentTime?.() > 3) {
      ytPlayerRef.current.seekTo(0, true);
      setCurrentTime(0);
      return;
    }
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCurrent((c) => {
        if (c) setQueue((q) => [c, ...q]);
        return prev;
      });
      loadIntoPlayer(prev);
      setIsPlaying(true);
      return h.slice(0, -1);
    });
  }, [loadIntoPlayer]);

  const togglePlay = useCallback(() => {
    if (!ytPlayerRef.current || !current) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  }, [isPlaying, current]);

  const seek = useCallback((time) => {
    ytPlayerRef.current?.seekTo(time, true);
    setCurrentTime(time);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffleOn((on) => {
      const next = !on;
      if (next) setQueue((q) => shuffleList(q));
      return next;
    });
  }, []);

  const toggleRadio = useCallback(() => setRadioOn((on) => !on), []);

  // Media Session API: lock-screen / notification playback controls, and
  // the browser's own "now playing" surfaces (best-effort background
  // integration — see README for what this does and doesn't guarantee).
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaSession || !current) return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.displayTitle || current.title,
      artist: current.artist || current.channel || "",
      album: "A-tune",
      artwork: current.thumbnail ? [{ src: current.thumbnail, sizes: "480x360", type: "image/jpeg" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", () => togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => togglePlay());
    navigator.mediaSession.setActionHandler("previoustrack", () => back());
    navigator.mediaSession.setActionHandler("nexttrack", () => realAdvance());
  }, [current, togglePlay, back, realAdvance]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaSession) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  const value = {
    ready,
    current,
    queue,
    history,
    isPlaying,
    shuffleOn,
    radioOn,
    radioLoading,
    currentTime,
    duration,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    registerYtPlayer,
    playNow,
    enqueue,
    playNext,
    removeFromQueue,
    shufflePlayList,
    startRadio,
    advance: realAdvance,
    back,
    togglePlay,
    seek,
    toggleShuffle,
    toggleRadio,
    ytPlayerRef,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
