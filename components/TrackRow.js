import { usePlayer } from "@/lib/PlayerContext";

function DotsMenuActions({ track, onQueue, onRadio }) {
  return (
    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRadio(track);
        }}
        title="Start radio from this song"
        className="text-[11px] border border-border rounded-full px-2 py-1 hover:border-accent hover:text-accent transition"
      >
        Radio
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQueue(track);
        }}
        title="Add to queue"
        className="text-[11px] border border-border rounded-full px-2 py-1 hover:border-accent hover:text-accent transition"
      >
        + Queue
      </button>
    </div>
  );
}

export default function TrackRow({ track, list, index }) {
  const { playNow, enqueue, startRadio, current } = usePlayer();
  const isCurrent = current?.videoId === track.videoId;

  function play() {
    if (list) {
      const rest = list.slice(index + 1);
      playNow(track, rest);
    } else {
      playNow(track);
    }
  }

  return (
    <div
      onClick={play}
      className={`group flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition ${
        isCurrent ? "bg-accentsoft" : "hover:bg-cardhover"
      }`}
    >
      <div className="relative w-11 h-11 shrink-0">
        {track.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.thumbnail} alt="" className="w-11 h-11 rounded-md object-cover" />
        )}
        {isCurrent && (
          <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center gap-[2px]">
            <span className="w-[3px] h-3 bg-accent rounded-full animate-pulseline" style={{ animationDelay: "0ms" }} />
            <span className="w-[3px] h-4 bg-accent rounded-full animate-pulseline" style={{ animationDelay: "150ms" }} />
            <span className="w-[3px] h-2 bg-accent rounded-full animate-pulseline" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${isCurrent ? "text-accent font-medium" : "text-ptext"}`}>{track.displayTitle || track.title}</p>
        <p className="text-xs text-muted truncate">
          {track.artist || track.channel}
          {track.year ? ` · ${track.year}` : ""}
        </p>
      </div>
      {track.duration && <span className="text-xs text-muted shrink-0 hidden sm:inline">{track.duration}</span>}
      <DotsMenuActions track={track} onQueue={enqueue} onRadio={startRadio} />
    </div>
  );
}
