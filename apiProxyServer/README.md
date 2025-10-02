# Anime Dashboard Backend

This serverless backend provides **daily anime quotes** and **daily wallpapers** for Chrome extension users.  
It uses caching to avoid exceeding API rate limits.

## Endpoints

- `/api/dailyQuote` → returns a JSON object `{ content, character, anime, timestamp }`
- `/api/dailyWallpaper?q=<query>` → returns `{ url, timestamp, source, page }`
