import * as cheerio from 'cheerio';

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:156.0) Gecko/20100101 Firefox/156.0",
  "Referer": "https://player.vidlove.cc/",
  "Origin": "https://player.vidlove.cc"
};

async function scrapeVidLove(type, tmdbId, season, episode) {
  try {
    const embedUrl = type === 'movie'
      ? `https://player.vidlove.cc/embed/movie/${tmdbId}`
      : `https://player.vidlove.cc/embed/tv/${tmdbId}/${season}/${episode}`;

    const pageRes = await fetch(embedUrl, { headers: HEADERS });
    if (!pageRes.ok) return null;

    const html = await pageRes.text();
    const $ = cheerio.load(html);

    let streamUrl = null;

    $('script').each((_, el) => {
      const content = $(el).html() || '';
      const match = content.match(/['"](https:\/\/a2\.whysosigmabro\.fun\/api\?[^'"]+seg=index\.m3u8[^'"]*)['"]/);
      if (match && !streamUrl) streamUrl = match[1];
    });

    if (!streamUrl) {
      streamUrl = $('source[type="application/x-mpegURL"]').attr('src')
               || $('video source').attr('src');
    }

    return streamUrl;
  } catch (err) {
    console.error(`Scrape failed: ${type}/${tmdbId}`, err.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const cleanUrl = req.url.replace('.json', '');
  const parts = cleanUrl.split('/').filter(Boolean);

  const type = parts[1];
  const rawId = parts[2];
  const season = parts[3];
  const episode = parts[4];

  const tmdbId = rawId?.replace(/^tmdb:/, '');

  if (!tmdbId || !type) {
    return res.status(200).json({ streams: [] });
  }

  const streamUrl = await scrapeVidLove(type, tmdbId, season, episode);

  if (!streamUrl) {
    return res.status(200).json({ streams: [] });
  }

  res.status(200).json({
    streams: [{
      name: "VidLove",
      title: `⚡ VidLove\n🎬 ${type === 'movie' ? 'Filme' : `S${season}E${episode}`}`,
      url: streamUrl,
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: { request: HEADERS }
      }
    }]
  });
}
