import { useEffect, useRef } from "react";
import { usePlayer } from "@/lib/PlayerContext";

let ytApiPromise = null;
function loadYouTubeAPI() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });
  return ytApiPromise;
}

/**
 * Deliberately rendered ONCE, at the root layout (see _app.js). Next.js
 * client-side routing swaps page components in and out, but this one never
 * does — so play/pause state and the underlying <iframe> survive every
 * navigation inside the app. That's what keeps audio going when you jump
 * between Home, Search, and Library instead of it restarting or cutting out.
 */
export default function PlayerHost() {
  const containerRef = useRef(null);
  const { registerYtPlayer, setIsPlaying, setDuration, setCurrentTime, advance, ytPlayerRef } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return;
      const player = new window.YT.Player(containerRef.current, {
        height: "100%",
        width: "100%",
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1, // required so iOS Safari doesn't force fullscreen and pause on route change
        },
        events: {
          onReady: () => registerYtPlayer(player),
          onStateChange: (e) => {
            const YT = window.YT.PlayerState;
            if (e.data === YT.PLAYING) {
              setIsPlaying(true);
              setDuration(player.getDuration());
            }
            if (e.data === YT.PAUSED) setIsPlaying(false);
            if (e.data === YT.ENDED) advance();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      ytPlayerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll current time for the scrub bar while playing.
  useEffect(() => {
    const id = setInterval(() => {
      if (ytPlayerRef.current?.getCurrentTime) {
        setCurrentTime(ytPlayerRef.current.getCurrentTime());
      }
    }, 500);
    return () => clearInterval(id);
  }, [ytPlayerRef, setCurrentTime]);

  // A 1x1 YouTube iframe still plays audio fine — we don't need to show
  // video at all for a music app, just keep it alive off-screen.
  return (
    <div className="fixed bottom-0 right-0 w-px h-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  );
}
