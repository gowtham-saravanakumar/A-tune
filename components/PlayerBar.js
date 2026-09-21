import { useState } from "react";
import { usePlayer } from "@/lib/PlayerContext";
import { toggleLiked, isLiked } from "@/lib/storage";
import QueueSheet from "./QueueSheet";

function Icon({ children, size = 18, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}
const PlayI = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 20} height={p.size || 20} fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseI = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 20} height={p.size || 20} fill="currentColor">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);
const NextI = (p) => <Icon {...p}><path d="M5 4l10 8-10 8V4z" fill="currentColor" stroke="none" /><path d="M19 5v14" /></Icon>;
const PrevI = (p) => <Icon {...p}><path d="M19 4L9 12l10 8V4z" fill="currentColor" stroke="none" /><path d="M5 5v14" /></Icon>;
const ShuffleI = (p) => <Icon {...p}><path d="M3 6h3l9 12h3M16 4l4 2-4 2M3 18h3l4-5M14 6l2.5-2M19 6h-3l-2.5 3" /></Icon>;
const RadioI = (p) => <Icon {...p}><circle cx="12" cy="12" r="2.5" /><path d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13" /></Icon>;
const HeartI = (p) => (
  <svg viewBox="0 0 24 24" width={p.size || 17} height={p.size || 17} fill={p.filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M12 21s-7.5-4.6-10-9.1C.4 8.6 2 5 5.6 5 8 5 10 6.6 12 9c2-2.4 4-4 6.4-4C22 5 23.6 8.6 22 11.9 19.5 16.4 12 21 12 21z" />
  </svg>
);
const QueueI = (p) => <Icon {...p}><path d="M3 6h13M3 12h13M3 18h9" /><path d="M19 9v9M19 9l-3 3M19 9l3 3" /></Icon>;

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PlayerBar() {
  const player = usePlayer();
  const { current, isPlaying, currentTime, duration, shuffleOn, radioOn, radioLoading } = player;
  const [showQueue, setShowQueue] = useState(false);
  const [liked, setLiked] = useState(false);

  if (!current) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-center text-sm text-muted px-4 z-40">
        Search for a song to start listening
      </div>
    );
  }

  function onLike() {
    const nowLiked = toggleLiked(current);
    setLiked(nowLiked);
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        {/* Scrub bar spans the full width, Spotify-style */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => player.seek(Number(e.target.value))}
          className="w-full accent-accent -mb-[2px]"
        />
        <div className="flex items-center gap-3 px-3 sm:px-4 py-2">
          <div className="flex items-center gap-3 min-w-0 w-[30%]">
            {current.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.thumbnail} alt="" className="w-11 h-11 rounded-md object-cover shrink-0" />
            )}
            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-medium truncate">{current.displayTitle || current.title}</p>
              <p className="text-xs text-muted truncate">{current.artist || current.channel}</p>
            </div>
            <button onClick={onLike} className={`shrink-0 hidden sm:block ${liked || isLiked(current.videoId) ? "text-accent" : "text-muted hover:text-ptext"}`}>
              <HeartI filled={liked || isLiked(current.videoId)} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="flex items-center gap-4">
              <button
                onClick={player.toggleShuffle}
                title="Shuffle the current queue"
                className={shuffleOn ? "text-accent" : "text-muted hover:text-ptext"}
              >
                <ShuffleI size={16} />
              </button>
              <button onClick={player.back} className="text-ptext hover:scale-105 transition">
                <PrevI size={20} />
              </button>
              <button
                onClick={player.togglePlay}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition"
              >
                {isPlaying ? <PauseI size={16} /> : <PlayI size={16} />}
              </button>
              <button onClick={player.advance} className="text-ptext hover:scale-105 transition">
                <NextI size={20} />
              </button>
              <button
                onClick={player.toggleRadio}
                title="Radio: keep playing similar songs — same artist, same year, or the same song family — once the queue ends"
                className={radioOn ? "text-accent" : "text-muted hover:text-ptext"}
              >
                <RadioI size={16} />
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted w-full max-w-md">
              <span className="w-9 text-right">{formatTime(currentTime)}</span>
              <span className="flex-1 text-center truncate">
                {radioLoading ? "Finding something similar…" : radioOn ? "Radio on" : ""}
              </span>
              <span className="w-9">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="w-[15%] flex justify-end">
            <button onClick={() => setShowQueue((s) => !s)} className={`p-2 rounded-full ${showQueue ? "text-accent" : "text-muted hover:text-ptext"}`}>
              <QueueI />
            </button>
          </div>
        </div>
      </div>
      {showQueue && <QueueSheet onClose={() => setShowQueue(false)} />}
    </>
  );
}
