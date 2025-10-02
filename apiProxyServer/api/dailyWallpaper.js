// api/dailyWallpaper.js

// Cache is handled by Vercel's Edge Network using Cache-Control headers.
// In-memory variables are NOT used for reliable caching.

// Pick wallpaper index based on today's date hash (This function is deterministic for 24 hours)
function getDailyIndex(listLength) {
  const today = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % listLength;
}

export default async function handler(req, res) {
  const query = req.query.q || "ghibli";

  const now = new Date();
  const midnight = new Date(now);

  midnight.setDate(now.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  const secondsUntilMidnight = Math.floor((midnight.getTime() - now.getTime()) / 1000);
  
  // 1. Set the Cache-Control Header
  // Vercel's CDN will cache the response for 24 hours, preventing repeated Wallhaven calls.
  res.setHeader('Cache-Control', `s-maxage=${secondsUntilMidnight}, stale-while-revalidate=59`);

  try {
    const apiRes = await fetch(
      `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(query)}&categories=110&purity=100&sorting=favorites&atleast=1920x1080`
    );
    const data = await apiRes.json();

    if (!data.data || data.data.length === 0) {
      throw new Error("No wallpapers found");
    }

    // 2. The index is calculated deterministically based on the date.
    const idx = getDailyIndex(data.data.length);
    const imageUrl = data.data[idx].path;
    const source = data.data[idx].source;
    const page = data.data[idx].url;

    const result = { url: imageUrl, timestamp: new Date().toISOString(), source: source, page: page};
    
    // 3. The result is returned and cached by Vercel's CDN for 24 hours.
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    // Do not cache error responses
    res.setHeader('Cache-Control', 'no-store'); 
    return res.status(500).json({ error: "Failed to fetch wallpaper" });
  }
}