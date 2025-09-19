export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // --- Route 1: Root redirect (dipertahankan) ---
  if (url.pathname === "/") {
    return Response.redirect("https://videy.co/", 302);
  }

  // --- Route 2: Generator endpoint (dipertahankan) ---
  if (url.pathname === "/g/") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response("Parameter 'url' tidak ditemukan.", { status: 400 });
    }

    const validPrefix = "https://dsvplay.com/e/";
    if (!targetUrl.startsWith(validPrefix)) {
      return new Response(
        "Format URL tidak valid. Harus dimulai dengan 'https://dsvplay.com/e/'.",
        { status: 400 }
      );
    }

    const videoId = targetUrl.substring(validPrefix.length);
    if (!videoId) {
      return new Response("ID tidak dapat diekstrak dari URL.", { status: 400 });
    }

    const destinationUrl = new URL(`/v/?id=${encodeURIComponent(videoId)}`, url);
    return Response.redirect(destinationUrl.toString(), 302);
  }

  // --- Route 3: Video page handler (disesuaikan) ---
  if (url.pathname === "/v/") {
    const ua = request.headers.get("user-agent") || "";
    const BOT_PATTERNS = [
      /facebookexternalhit/i, /Facebot/i, /Twitterbot/i, /X-Twitterbot/i,
      /Slackbot-LinkExpanding/i, /WhatsApp/i, /TelegramBot/i,
      /LinkedInBot/i, /Discordbot/i, /redditbot/i, /Pinterest/i,
      /Googlebot/i, /bingbot/i, /Applebot/i
    ];
    const isBot = BOT_PATTERNS.some((re) => re.test(ua));

    // Untuk bot/unfurl/HEAD → langsung ke artikel asli (bukan root)
    if (isBot || request.method === "HEAD") {
      return Response.redirect(
        "https://maneh.blog/#p/perang-dingin-digital-keamanan-siber",
        302
      );
    }

    // Untuk human → serve videy.html (first-load),
    // videy.html yang urus history.replaceState & redirect saat reload
    const assetUrl = new URL("/videy.html", url);

    // Ambil file statis lalu pasang header no-store agar F5 dihitung "reload" sungguhan
    const resp = await env.ASSETS.fetch(assetUrl);
    const headers = new Headers(resp.headers);
    headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");

    return new Response(resp.body, { status: resp.status, headers });
  }

  // --- Fallback: biarkan Pages serve asset lain seperti biasa ---
  return env.ASSETS.fetch(request);
}
