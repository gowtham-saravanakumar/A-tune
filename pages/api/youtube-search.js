// Server-side YouTube search — no official YouTube Data API key and no
// daily quota. We fetch YouTube's own public search-results page and read
// the same `ytInitialData` JSON blob the page itself renders from. This is
// the exact approach chatuneplay's /api/youtube-search uses.

function decodeHtml(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function extractInitialData(html) {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  const end = html.indexOf(";</script>", jsonStart);
  const raw = end === -1 ? html.slice(jsonStart) : html.slice(jsonStart, end);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findVideoRenderers(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) findVideoRenderers(item, out);
    return out;
  }
  if (node.videoRenderer) out.push(node.videoRenderer);
  for (const key of Object.keys(node)) {
    if (key === "videoRenderer") continue;
    findVideoRenderers(node[key], out);
  }
  return out;
}

export function textFrom(field) {
  if (!field) return "";
  if (field.simpleText) return field.simpleText;
  if (Array.isArray(field.runs)) return field.runs.map((r) => r.text).join("");
  return "";
}

export function bestThumbnail(renderer) {
  const thumbs = renderer.thumbnail?.thumbnails;
  if (!Array.isArray(thumbs) || thumbs.length === 0) return null;
  return thumbs[thumbs.length - 1].url;
}

export function isLiveBadge(renderer) {
  return renderer.badges?.some((b) => /live/i.test(b?.metadataBadgeRenderer?.label || ""));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(200).json({ results: [] });

  try {
    const searchUrl = new URL("https://www.youtube.com/results");
    searchUrl.searchParams.set("search_query", q);
    // Music-flavoured params keep results closer to songs than vlogs/podcasts.
    searchUrl.searchParams.set("hl", "en");
    searchUrl.searchParams.set("gl", "US");

    const response = await fetch(searchUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Couldn't reach YouTube right now. Try again in a moment." });
    }

    const html = await response.text();
    const data = extractInitialData(html);
    if (!data) {
      return res.status(502).json({ error: "Couldn't read YouTube search results. Try again in a moment." });
    }

    const renderers = findVideoRenderers(data).filter((v) => v.videoId);
    const seen = new Set();
    const results = [];
    for (const v of renderers) {
      if (seen.has(v.videoId)) continue;
      seen.add(v.videoId);
      if (isLiveBadge(v)) continue; // live streams don't fit a queue

      results.push({
        videoId: v.videoId,
        title: decodeHtml(textFrom(v.title)),
        channel: decodeHtml(textFrom(v.longBylineText) || textFrom(v.ownerText)),
        thumbnail: bestThumbnail(v),
        duration: textFrom(v.lengthText) || null,
      });

      if (results.length >= 20) break;
    }

    res.setHeader("Cache-Control", "private, max-age=30");
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: "Couldn't reach YouTube right now. Try again in a moment." });
  }
}
