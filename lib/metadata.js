// A-tune has no official music metadata API (no Spotify/MusicBrainz key
// required, by design — see README). To power "more like this / same
// artist / same year" we guess artist + year from the two strings YouTube
// already gives every result: the video title and the channel name.
//
// This is intentionally simple heuristics, not a real tagger. It's good
// enough to group a "Topic" auto-generated music channel's uploads (which
// is most official audio on YouTube) and to catch the common
// "Artist - Song" title pattern everything else tends to use.

const TOPIC_SUFFIX = /\s*-\s*topic$/i;
const NOISE_PARENS = /\((official( )?(music )?video|official audio|lyrics?( video)?|audio|visualizer|hd|4k|remaster(ed)?[^)]*|explicit|clean)\)/gi;
const NOISE_BRACKETS = /\[[^\]]*\]/g;
const YEAR_RE = /\b(19[5-9]\d|20[0-4]\d)\b/;

export function cleanTitle(rawTitle) {
  if (!rawTitle) return "";
  return rawTitle
    .replace(NOISE_BRACKETS, "")
    .replace(NOISE_PARENS, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Guess the artist name from a search/related result. */
export function guessArtist(rawTitle, channel) {
  if (channel && TOPIC_SUFFIX.test(channel)) {
    // YouTube auto-generates "<Artist> - Topic" channels for uploaded
    // official audio — this is the single most reliable signal we have.
    return channel.replace(TOPIC_SUFFIX, "").trim();
  }

  const title = cleanTitle(rawTitle);
  // Common "Artist - Song" / "Artist – Song" / "Artist — Song" pattern.
  const dash = title.match(/^(.{1,60}?)\s*[-–—]\s*(.{1,120})$/);
  if (dash) return dash[1].trim();

  // "Artist: Song" or "Artist | Song"
  const pipe = title.match(/^(.{1,60}?)\s*[|:]\s*(.{1,120})$/);
  if (pipe) return pipe[1].trim();

  // Fall back to the channel name itself (VEVO channels, band channels…)
  if (channel) return channel.replace(/vevo$/i, "").trim();
  return null;
}

/** Guess a song title without the artist prefix, for nicer display. */
export function guessSongTitle(rawTitle, channel) {
  const title = cleanTitle(rawTitle);
  const artist = guessArtist(rawTitle, channel);
  if (artist) {
    const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stripped = title.replace(new RegExp(`^${escaped}\\s*[-–—|:]\\s*`, "i"), "");
    if (stripped && stripped !== title) return stripped.trim();
  }
  return title;
}

/** Guess a release year from the title (e.g. "Song (2016)"), best-effort. */
export function guessYear(rawTitle) {
  const m = (rawTitle || "").match(YEAR_RE);
  return m ? m[0] : null;
}

/** Attach guessed artist/year/displayTitle onto a raw search/related result. */
export function enrich(result) {
  const artist = guessArtist(result.title, result.channel);
  return {
    ...result,
    artist,
    year: guessYear(result.title),
    displayTitle: guessSongTitle(result.title, result.channel),
  };
}
