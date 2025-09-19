export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Alihkan root domain (https://quaxy.my/) ke https://videy.co/
    if (url.pathname === "/") {
      return new Response(null, {
        status: 302, // Redirect sementara
        headers: {
          "location": "https://videy.co/",
        },
      });
    }

    // [BARU] Endpoint untuk generate ID dari URL dsvplay.com
    // Contoh: /g/?url=https://dsvplay.com/e/some_id
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
      const destinationUrl = new URL(`/v/?id=${encodeURIComponent(videoId)}`, request.url);
      return Response.redirect(destinationUrl.toString(), 302);
    }

    // Hanya tangani /v/…   (contoh: https://quaxy.my/v/?id=8xcammg8kvin)
    if (url.pathname === "/v/") {
      const ua = request.headers.get("user-agent") || "";
      const method = request.method || "GET";

      // Daftar user-agent crawler yang melakukan unfurl/preview
      const BOT_PATTERNS = [
        /facebookexternalhit/i, /Facebot/i, /Twitterbot/i, /X-Twitterbot/i,
        /Slackbot-LinkExpanding/i, /WhatsApp/i, /TelegramBot/i,
        /LinkedInBot/i, /Discordbot/i, /redditbot/i, /Pinterest/i
      ];
      const isBot = BOT_PATTERNS.some((re) => re.test(ua)) || method === "HEAD";

      if (isBot) {
        // Untuk bot: alihkan ke maneh.blog
        return new Response(null, {
          status: 302, // Redirect sementara
          headers: {
            "location": "https://maneh.blog/",
          },
        });
      }

      // Untuk manusia: Tampilkan konten dari videy.html.
      // URL di browser tetap https://quaxy.my/v/?id=...
      // JS di dalam videy.html akan membaca 'id' dari URL untuk memuat video yang benar.
      const assetUrl = new URL('/videy.html', request.url);
      return env.ASSETS.fetch(assetUrl);
    }

    return new Response("Not Found", { status: 404 });
  },
};