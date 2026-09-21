// api/stream.js
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:156.0) Gecko/20100101 Firefox/156.0",
  "Referer": "https://player.vidlove.cc/",
  "Origin": "https://player.vidlove.cc"
};

async function getStreamUrl(type, tmdbId, season, episode) {
  const embedUrl = type === 'movie'
    ? `https://player.vidlove.cc/embed/movie/${tmdbId}`
    : `https://player.vidlove.cc/embed/tv/${tmdbId}/${season}/${episode}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setUserAgent(HEADERS["User-Agent"]);
    
    // Interceptar requisições de rede para capturar o m3u8
    let streamUrl = null;
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.m3u8') || url.includes('whysosigmabro.fun')) {
        streamUrl = url;
      }
      request.continue();
    });

    await page.goto(embedUrl, { 
      waitUntil: 'networkidle2',
      timeout: 45000 
    });

    // Esperar um pouco para garantir que o player carregou
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Se não capturou via interceptação, tentar extrair do DOM
    if (!streamUrl) {
      streamUrl = await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video && video.src) return video.src;
        const source = document.querySelector('source[type="application/x-mpegURL"]');
        if (source) return source.src;
        return null;
      });
    }

    return streamUrl;
  } catch (err) {
    console.error(`Puppeteer failed: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Suporta query params (do vercel.json) e path params
  let type, rawId, season, episode;
  
  if (req.query.type && req.query.id) {
    type = req.query.type;
    rawId = req.query.id;
    season = req.query.season;
    episode = req.query.episode;
  } else {
    const cleanUrl = req.url.replace('.json', '').split('?')[0];
    const parts = cleanUrl.split('/').filter(Boolean);
    type = parts[1];
    rawId = parts[2];
    season = parts[3];
    episode = parts[4];
  }

  const tmdbId = rawId?.replace(/^tmdb:/, '');

  if (!tmdbId || !type) {
    return res.status(200).json({ streams: [] });
  }

  const streamUrl = await getStreamUrl(type, tmdbId, season, episode);

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
