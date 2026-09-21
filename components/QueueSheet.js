import { usePlayer } from "@/lib/PlayerContext";

export default function QueueSheet({ onClose }) {
  const { current, queue, removeFromQueue, playNow, radioOn } = usePlayer();

  return (
    <div className="fixed bottom-16 right-3 w-[320px] max-h-[70vh] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-floatin">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Queue</p>
        <button onClick={onClose} className="text-muted hover:text-ptext text-sm">
          Close
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {current && (
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs text-muted mb-2">Now playing</p>
            <div className="flex items-center gap-3">
              {current.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-accent">{current.displayTitle || current.title}</p>
                <p className="text-xs text-muted truncate">{current.artist || current.channel}</p>
              </div>
            </div>
          </div>
        )}

        {queue.length > 0 && (
          <div className="px-4 py-2">
            <p className="text-xs text-muted mb-2">Next up</p>
            <ul className="space-y-1">
              {queue.map((t, i) => (
                <li key={t.videoId + i} className="flex items-center gap-3 group rounded-lg p-1.5 hover:bg-cardhover">
                  <button onClick={() => playNow(t)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    {t.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.thumbnail} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm truncate">{t.displayTitle || t.title}</p>
                      <p className="text-xs text-muted truncate">{t.artist || t.channel}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeFromQueue(t.videoId)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-xs shrink-0 px-1"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {queue.length === 0 && (
          <p className="px-4 py-6 text-xs text-muted text-center">
            {radioOn
              ? "Nothing queued — Radio will pick what plays next based on this track."
              : "Nothing queued. Turn on Radio to keep music playing automatically."}
          </p>
        )}
      </div>
    </div>
  );
}
