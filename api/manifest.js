export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    id: "com.nuvio.vidlove",
    version: "1.0.0",
    name: "VidLove Provider",
    description: "Streams via VidLove embed (TMDB)",
    resources: ["stream"],
    types: ["movie", "series"],
    catalogs: []
  });
}
