// Powers Radio / autoplay. Given a videoId, fetches that video's public
// watch page and reads the "up next" / related list out of the same
// `ytInitialData` blob YouTube's own page uses to render its sidebar —
// same no-key, no-quota approach as /api/youtube-search.

import { extractInitialData, textFrom, bestThumbnail } from "./youtube-search";

function decodeHtml(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function findCompactRenderers(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) findCompactRenderers(item, out);
    return out;
  }
  if (node.compactVideoRenderer) out.push(node.compactVideoRenderer);
  for (const key of Object.keys(node)) {
    if (key === "compactVideoRenderer") continue;
    findCompactRenderers(node[key], out);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const videoId = (req.query.videoId || "").toString().trim();
  if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) {
    return res.status(200).json({ results: [] });
  }

  try {
    const watchUrl = new URL("https://www.youtube.com/watch");
    watchUrl.searchParams.set("v", videoId);
    watchUrl.searchParams.set("hl", "en");
    watchUrl.searchParams.set("gl", "US");

    const response = await fetch(watchUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "PREF=hl=en&gl=US;", // nudges YouTube away from region/consent interstitials
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Couldn't reach YouTube right now." });
    }

    const html = await response.text();
    const data = extractInitialData(html);
    if (!data) return res.status(200).json({ results: [] });

    const renderers = findCompactRenderers(data).filter((v) => v.videoId);
    const seen = new Set([videoId]);
    const results = [];
    for (const v of renderers) {
      if (seen.has(v.videoId)) continue;
      seen.add(v.videoId);
      if (v.badges?.some((b) => /live/i.test(b?.metadataBadgeRenderer?.label || ""))) continue;

      results.push({
        videoId: v.videoId,
        title: decodeHtml(textFrom(v.title)),
        channel: decodeHtml(textFrom(v.longBylineText) || textFrom(v.shortBylineText)),
        thumbnail: bestThumbnail(v),
        duration: textFrom(v.lengthText) || null,
      });

      if (results.length >= 25) break;
    }

    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: "Couldn't reach YouTube right now." });
  }
}
