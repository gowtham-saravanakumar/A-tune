import { useEffect, useState } from "react";
import { usePlayer } from "@/lib/PlayerContext";
import { getLiked, getHistory } from "@/lib/storage";
import TrackRow from "@/components/TrackRow";

const TABS = ["Liked songs", "History"];

export default function Library() {
  const { shufflePlayList, startRadio } = usePlayer();
  const [tab, setTab] = useState("Liked songs");
  const [liked, setLiked] = useState([]);
  const [history, setHistory] = useState([]);

  function refresh() {
    setLiked(getLiked());
    setHistory(getHistory());
  }

  useEffect(() => {
    refresh();
    // Liked/history can change from other tabs opened elsewhere; a light
    // focus-based refresh keeps this page from ever looking stale.
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const list = tab === "Liked songs" ? liked : history;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold">Your Library</h1>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm rounded-full px-4 py-1.5 border transition ${
                tab === t ? "bg-white text-black border-white" : "border-border text-muted hover:text-ptext"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {list.length > 1 && (
          <button
            onClick={() => shufflePlayList(list)}
            className="text-xs border border-border rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition"
          >
            Shuffle play
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted text-center py-16">
          {tab === "Liked songs" ? "Tap the heart on a song to save it here." : "Play something and it'll show up here."}
        </p>
      ) : (
        <div className="space-y-1">
          {list.map((t, i) => (
            <TrackRow key={t.videoId + i} track={t} list={list} index={i} />
          ))}
        </div>
      )}

      {list.length > 0 && (
        <button
          onClick={() => list[0] && startRadio(list[Math.floor(Math.random() * list.length)])}
          className="text-xs text-muted hover:text-accent transition"
        >
          Start a radio from a random pick in this list →
        </button>
      )}
    </div>
  );
}
