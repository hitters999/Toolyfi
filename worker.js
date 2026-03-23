export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "videoId parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Method 1: YouTube timedtext API
    try {
      const timedTextUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`;
      const res = await fetch(timedTextUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.events) {
          const text = data.events
            .filter(e => e.segs)
            .map(e => e.segs.map(s => s.utf8 || "").join(""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (text.length > 50) {
            return new Response(
              JSON.stringify({ transcript: text }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    } catch (e) {}

    // Method 2: YouTube watch page scraping
    try {
      const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const ytRes = await fetch(ytUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        }
      });
      const html = await ytRes.text();

      const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
      if (captionMatch) {
        const captions = JSON.parse(captionMatch[1]);
        const track = captions.find(t => t.languageCode === "en") || captions[0];

        if (track && track.baseUrl) {
          const transcriptRes = await fetch(track.baseUrl);
          const xml = await transcriptRes.text();
          const texts = [...xml.matchAll(/<text[^>]*>(.*?)<\/text>/gs)]
            .map(m => m[1]
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/<[^>]*>/g, "")
            )
            .join(" ");

          if (texts.length > 50) {
            return new Response(
              JSON.stringify({ transcript: texts }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    } catch (e) {}

    // All methods failed
    return new Response(
      JSON.stringify({ error: "Transcript not available for this video" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
