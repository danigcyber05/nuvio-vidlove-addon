// server.js
import express from 'express';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const app = express();
const PORT = process.env.PORT || 3000;

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
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setUserAgent(HEADERS["User-Agent"]);
    
    let streamUrl = null;
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      if ((url.includes('.m3u8') || url.includes('whysosigmabro')) && !streamUrl) {
        streamUrl = url.split('?')[0] + '?' + url.split('?')[1]; // Limpar URL
      }
      request.continue();
    });

    await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (!streamUrl) {
      streamUrl = await page.evaluate(() => {
        const video = document.querySelector('video');
        return video?.src || document.querySelector('source[type="application/x-mpegURL"]')?.src || null;
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

// Manifest endpoint
app.get('/manifest.json', (req, res) => {
  res.json({
    id: "com.nuvio.vidlove",
    version: "1.0.0",
    name: "VidLove Provider",
    description: "Streams via VidLove embed (TMDB)",
    resources: ["stream"],
    types: ["movie", "series"],
    catalogs: []
  });
});

// Stream endpoint
app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  const tmdbId = id.replace(/^tmdb:/, '');
  
  if (!tmdbId || !type) {
    return res.json({ streams: [] });
  }

  const streamUrl = await getStreamUrl(type, tmdbId);
  
  if (!streamUrl) {
    return res.json({ streams: [] });
  }

  res.json({
    streams: [{
      name: "VidLove",
      title: `⚡ VidLove\n🎬 ${type === 'movie' ? 'Filme' : 'Série'}`,
      url: streamUrl,
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: { request: HEADERS }
      }
    }]
  });
});

// Stream endpoint para séries
app.get('/stream/:type/:id/:season/:episode.json', async (req, res) => {
  const { type, id, season, episode } = req.params;
  const tmdbId = id.replace(/^tmdb:/, '');
  
  if (!tmdbId || !type) {
    return res.json({ streams: [] });
  }

  const streamUrl = await getStreamUrl(type, tmdbId, season, episode);
  
  if (!streamUrl) {
    return res.json({ streams: [] });
  }

  res.json({
    streams: [{
      name: "VidLove",
      title: `⚡ VidLove\n🎬 S${season}E${episode}`,
      url: streamUrl,
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: { request: HEADERS }
      }
    }]
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
