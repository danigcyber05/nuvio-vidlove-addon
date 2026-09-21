// api/stream.js
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

  // Constrói URL do embed exatamente como o VidLove espera
  const embedUrl = type === 'movie'
    ? `https://player.vidlove.cc/embed/movie/${tmdbId}?autoplay=true`
    : `https://player.vidlove.cc/embed/tv/${tmdbId}/${season}/${episode}?autoplay=true`;

  res.status(200).json({
    streams: [{
      name: "VidLove",
      title: `⚡ VidLove\n🎬 ${type === 'movie' ? 'Filme' : `S${season}E${episode}`}`,
      url: embedUrl,
      behaviorHints: {
        notWebReady: false,
        bingeable: type === 'series'
      }
    }]
  });
}
