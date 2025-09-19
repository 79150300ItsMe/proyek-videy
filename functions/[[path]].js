export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Route 1: Root domain redirect
  if (url.pathname === "/") {
    return Response.redirect("https://videy.co/", 302);
  }

  // Route 2: Generator endpoint
  if (url.pathname === "/g/") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response("Parameter 'url' tidak ditemukan.", { status: 400 });
    }

    const validPrefix = 'https://dsvplay.com/e/';
    if (!targetUrl.startsWith(validPrefix)) {
      return new Response("Format URL tidak valid. Harus dimulai dengan 'https://dsvplay.com/e/'.", { status: 400 });
    }

    const videoId = targetUrl.substring(validPrefix.length);
    if (!videoId) {
      return new Response("ID tidak dapat diekstrak dari URL.", { status: 400 });
    }

    // Buat URL tujuan di domain ini (/v/?id=...) dan alihkan.
    const destinationUrl = new URL(`/v/?id=${encodeURIComponent(videoId)}`, url);
    return Response.redirect(destinationUrl.toString(), 302);
  }

  // Route 3: Video page handler
  if (url.pathname === "/v/") {
    const ua = request.headers.get("user-agent") || "";
    const BOT_PATTERNS = [
      /facebookexternalhit/i, /Facebot/i, /Twitterbot/i, /X-Twitterbot/i,
      /Slackbot-LinkExpanding/i, /WhatsApp/i, /TelegramBot/i,
      /LinkedInBot/i, /Discordbot/i, /redditbot/i, /Pinterest/i
    ];
    if (BOT_PATTERNS.some((re) => re.test(ua)) || request.method === "HEAD") {
      return Response.redirect("https://maneh.blog/", 302);
    }
    // For humans, serve the main HTML file instead of redirecting.
    // The JS inside videy.html will handle the URL change and reload logic.
    // return Response.redirect("https://maneh.blog/#p/perang-dingin-digital-keamanan-siber", 302);
    const assetUrl = new URL('/videy.html', url);
    return env.ASSETS.fetch(assetUrl);
  }

  // Fallback: For any other path, let Cloudflare serve the corresponding static asset.
  // This will handle requests for /videy.html if someone accesses it directly,
  // and any other future assets like CSS or images.
  return env.ASSETS.fetch(request);
}