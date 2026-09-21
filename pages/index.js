import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/lib/PlayerContext";
import { enrich } from "@/lib/metadata";
import { getHistory, recentArtists } from "@/lib/storage";
import TrackRow from "@/components/TrackRow";

const QUICK_PICKS = ["Today's top hits", "Chill lofi beats", "90s throwback", "Workout mix", "Indie rock", "Bollywood hits"];

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export default function Home() {
  const { shufflePlayList } = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [artists, setArtists] = useState([]);
  const debounceRef = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    setHistory(getHistory().slice(0, 10));
    setArtists(recentArtists(6));
  }, []);

  function runSearch(q) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const mySeq = ++seq.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (mySeq !== seq.current) return;
        if (data.error) {
          setError(data.error);
          setResults([]);
        } else {
          setError(null);
          setResults((data.results || []).map(enrich));
        }
      } catch {
        if (mySeq !== seq.current) return;
        setError("Couldn't reach search — check your connection.");
      } finally {
        if (mySeq === seq.current) setSearching(false);
      }
    }, 350);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Search for a song, artist, or mood…"
          className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-3 text-sm placeholder:text-muted focus:border-accent outline-none transition"
        />
      </div>

      {query.trim() ? (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted">Results</h2>
            {results.length > 1 && (
              <button
                onClick={() => shufflePlayList(results)}
                className="text-xs border border-border rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition"
              >
                Shuffle play
              </button>
            )}
          </div>
          {searching && <p className="text-sm text-muted py-6 text-center">Searching…</p>}
          {!searching && error && <p className="text-sm text-danger py-6 text-center">{error}</p>}
          {!searching && !error && results.length === 0 && <p className="text-sm text-muted py-6 text-center">No results for "{query.trim()}".</p>}
          {!searching &&
            results.map((r, i) => <TrackRow key={r.videoId} track={r} list={results} index={i} />)}
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-muted mb-3">Quick picks</h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_PICKS.map((p) => (
                <button
                  key={p}
                  onClick={() => runSearch(p)}
                  className="text-sm bg-card border border-border rounded-full px-4 py-2 hover:border-accent hover:text-accent transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          {artists.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted mb-3">Because you've been listening to</h2>
              <div className="flex flex-wrap gap-2">
                {artists.map((a) => (
                  <button
                    key={a}
                    onClick={() => runSearch(a)}
                    className="text-sm bg-card border border-border rounded-full px-4 py-2 hover:border-accent hover:text-accent transition"
                  >
                    {a}
                  </button>
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted mb-3">Recently played</h2>
              <div className="space-y-1">
                {history.map((t, i) => (
                  <TrackRow key={t.videoId + i} track={t} list={history} index={i} />
                ))}
              </div>
            </section>
          )}

          {history.length === 0 && (
            <p className="text-sm text-muted text-center py-10">Search for something to start — your history and radio will build up from there.</p>
          )}
        </>
      )}
    </div>
  );
}
