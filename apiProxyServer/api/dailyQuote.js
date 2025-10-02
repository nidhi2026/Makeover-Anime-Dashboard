// api/dailyQuote.js
export default async function handler(req, res) {
    // 1. Set the Cache-Control Header
    // 's-maxage=86400' = Cache for Vercel's Edge/CDN for 24 hours (60s * 60m * 24h)
    // 'stale-while-revalidate=59' = Serve stale cache while checking for new data (optional but good)
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=59');

    try {
        // 2. Fetch the Quote
        // Assuming the actual endpoint is:
        const apiRes = await fetch("https://api.animechan.io/v1/quotes/random");
        const data = await apiRes.json();
        const quoteData = data.data;   

        const newQuote = {
            content: quoteData.content,  // Use .quote field if it's the standard API response
            character: quoteData.character.name,
            anime: quoteData.anime.name,
            timestamp: new Date().toISOString()
        };

        // 3. Respond with the Quote (Vercel Edge caches this result for 24 hours)
        return res.status(200).json(newQuote);

    } catch (err) {
        console.error(err);
        // Do not cache error responses
        res.setHeader('Cache-Control', 'no-store'); 
        return res.status(500).json({ error: "Failed to fetch quote err" });
    }
}