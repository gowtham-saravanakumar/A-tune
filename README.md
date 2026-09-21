# A-tune

A single-user, Spotify-style web player: search YouTube for a song, hit
play, and it keeps going — shuffle, a persistent mini-player that never
resets as you move around the app, and a "Radio" mode that keeps queuing
similar songs (same artist, same year, or the same song/cover family) once
your queue runs out. Built on the same "no official API key, no quota"
YouTube search technique as **chatuneplay**, which this project reuses and
extends.

No login, no database — everything (liked songs, play history) lives in
your browser's `localStorage`, per device.

## What's inside

```
atune/
├── pages/
│   ├── _app.js               PlayerProvider + the one persistent <PlayerHost/> + Layout
│   ├── _document.js          PWA manifest / theme-color / iOS "add to home screen" meta
│   ├── index.js               Home: search, quick picks, recently played
│   ├── library.js             Liked songs + full history, shuffle-playable
│   └── api/
│       ├── youtube-search.js   Search — scrapes YouTube's own public search page (no API key, no quota)
│       └── youtube-related.js  "Up next" scrape off a watch page — feeds Radio mode
├── components/
│   ├── PlayerHost.js          The actual (invisible) YouTube <iframe> player — mounted ONCE
│   ├── PlayerBar.js           The visible bottom transport bar (play/pause, shuffle, radio, scrub)
│   ├── QueueSheet.js          "Now playing" + upcoming queue panel
│   ├── TrackRow.js            One row in a result/library list, with Radio/+Queue actions
│   └── Layout.js              Sidebar / bottom nav + page content + PlayerBar
├── lib/
│   ├── PlayerContext.js       All playback state: queue, history, shuffle, radio, Media Session
│   ├── queueEngine.js         The shuffle algorithm + the radio "pick what's next" algorithm
│   ├── metadata.js            Guesses artist / year / clean title from a YouTube title+channel
│   └── storage.js             localStorage: liked songs, play history
└── styles/globals.css
```

## How playback keeps going ("background play")

Three separate things people usually mean by that, and how far this app
gets with each of them:

1. **"Don't restart the song when I go to a different tab/page inside the
   app"** — solved. `<PlayerHost/>` (the real YouTube iframe) is rendered
   once, in `_app.js`, outside of `<Component/>`. Next.js's client-side
   router swaps `Home`/`Library` in and out, but never touches
   `PlayerHost`, so the `<iframe>` and its playback state are untouched by
   navigation. This is the same trick chatuneplay uses to keep its player
   mounted across tabs.
2. **"Keep playing audio while I'm in another browser tab / the window
   isn't focused"** — works in essentially every desktop and mobile
   browser, because that's just a normal HTML5 `<video>`/`<iframe>`
   continuing to play; browsers don't pause media just because a tab lost
   focus.
3. **"Keep playing with the phone locked / app in the background"** — this
   is the one to be upfront about. A web page cannot truly hold system
   audio focus the way a native app can. What this app *does* do:
   - Sets the **Media Session API** (`navigator.mediaSession`) on every
     track change, so supporting browsers show lock-screen / notification
     playback controls (play, pause, next, previous) and route hardware
     media keys to the app.
   - Ships a PWA `manifest.json` so it can be "Added to Home Screen" and
     opens full-screen like an app, which some mobile browsers treat more
     leniently for background media than a page still inside browser
     chrome.
   - In practice: Chrome/Android tends to keep audio going for a while
     after the screen locks, especially once "installed"; iOS Safari is
     the strictest and is the most likely to pause when the screen locks
     or you switch apps. There is no reliable way around this from a
     website — a guaranteed always-on lock-screen player needs a native
     iOS/Android app with real background-audio entitlements, the same
     ceiling chatuneplay's README notes for real lock-screen widgets.

## The shuffle + radio algorithm (`lib/queueEngine.js`)

- **Shuffle** — a standard Fisher–Yates shuffle of whatever list you shuffle-play
  (search results, Liked Songs, history), followed by a pass that nudges
  apart two songs by the same guessed artist landing back-to-back.
- **Radio (autoplay continuation)** — when the manual queue empties and
  Radio is on, `advance()`:
  1. Fetches two candidate pools in parallel: YouTube's own "related /
     up next" list for the track that just finished
     (`/api/youtube-related`), and a plain search for the guessed artist
     name (`/api/youtube-search`), so "more of this artist" isn't limited
     to whatever YouTube's sidebar happens to suggest.
  2. Scores every candidate against the track that just ended: **+5** same
     guessed artist, **+3** same guessed release year, **+1** if it looks
     like the same song/cover/remix family, **+1** baseline for everything
     (it's already something YouTube considered related). Anything already
     in the last ~40 played tracks is dropped so Radio doesn't loop.
  3. Picks **weighted-randomly** among the top-scoring candidates — not
     always the single best match — so a listening session doesn't
     collapse into replaying the same five songs. This is what gives you
     "random play of the same song / same artist / same year," as asked.

Because YouTube doesn't hand this project real music metadata (no API key,
remember), "artist" and "year" are *guessed* from the video title and
channel name in `lib/metadata.js` — reliable for YouTube's auto-generated
"`Artist` - Topic" music channels, decent for the common "Artist - Song"
title pattern, and a plain fallback (the channel name) otherwise. It won't
be perfect for every upload.

## How search & radio avoid the YouTube Data API

Both `/api/youtube-search` and `/api/youtube-related` fetch YouTube's own
public pages server-side (search results / watch page) and read the same
`ytInitialData` JSON the page itself renders from — no API key, no daily
quota. This is the exact approach chatuneplay's `/api/youtube-search`
uses, extended here with a second route that reads a watch page's "up
next" sidebar for Radio. The trade-off is the same one chatuneplay's
README calls out: this depends on YouTube's page structure rather than a
stable, versioned API, so a YouTube redesign could require a small parser
update in these two files.

## Running it

```bash
npm install
npm run dev
```
Open `http://localhost:3000`. No environment variables, no API keys.

## Deploying

Standard Next.js app — any Node 18+ host works (Render, Railway, Fly.io, a
VPS, Vercel, etc.):
```bash
npm install
npm run build
npm start
```

## Known limitations

- **Guessed metadata, not real tags** — see "shuffle + radio algorithm"
  above. There's no Spotify/MusicBrainz-style database behind this.
- **No true background audio on a locked phone** — see "How playback
  keeps going" above; this is a browser platform limit, not a bug.
- **Search and Radio depend on YouTube's page structure**, not a stable
  versioned API.
- **No database / no login, by design** — liked songs and history are
  per-browser `localStorage`. Clearing site data clears them.
