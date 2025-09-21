import videoIds from './video-ids.js';

// Definisikan pola bot di luar handler agar tidak dibuat ulang pada setiap request.
// Ini adalah praktik terbaik untuk performa di lingkungan serverless.
const BOT_PATTERNS = [
  /bot/i, /spider/i, /crawler/i,                  // Pola umum
  /facebookexternalhit/i, /Facebot/i, /Twitterbot/i, /Instagram/i, /ThreadsInApp/i, // Media Sosial
  /WhatsApp/i, /TelegramBot/i, /Discordbot/i,       // Aplikasi Chat
  /Googlebot/i, /bingbot/i, /Slurp/i, /DuckDuckBot/i, // Mesin Pencari
  /Baiduspider/i, /YandexBot/i,
  /Slackbot-LinkExpanding/i, /LinkedInBot/i,        // Lainnya
];

// Cache untuk performa
const CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Alihkan root domain (https://quaxy.my/) ke https://videy.co/
  if (url.pathname === "/") {
    return Response.redirect("https://videy.co/", 302);
  }

  // Endpoint untuk generate ID dari URL dsvplay.com
  if (url.pathname === "/g/") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response("Parameter 'url' tidak ditemukan.", { 
        status: 400,
        headers: CACHE_HEADERS
      });
    }
    const validPrefix = 'https://dsvplay.com/e/';
    if (!targetUrl.startsWith(validPrefix)) {
      return new Response("Format URL tidak valid. Harus dimulai dengan 'https://dsvplay.com/e/'.", { 
        status: 400,
        headers: CACHE_HEADERS
      });
    }
    const videoId = targetUrl.substring(validPrefix.length);
    if (!videoId) {
      return new Response("ID tidak dapat diekstrak dari URL.", { 
        status: 400,
        headers: CACHE_HEADERS
      });
    }

    const destinationUrl = new URL(`/v/?id=${encodeURIComponent(videoId)}`, url);
    return Response.redirect(destinationUrl.toString(), 302);
  }

  // Handler untuk /v/
  if (url.pathname === "/v/") {
    const videoId = url.searchParams.get('id');

    // Validasi: Cek apakah ID ada di dalam daftar yang valid
    if (!videoId || !videoIds.includes(videoId)) {
      return new Response("ID Video tidak valid atau tidak ditemukan.", {
        status: 404,
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          ...CACHE_HEADERS
        }
      });
    }

    // Cek apakah ini permintaan dari reverse proxy kita di maneh.blog
    const isProxyRequest = request.headers.get("X-Proxy-Request") === "true";

    if (isProxyRequest) {
      // Jika ya, sajikan konten videy.html secara langsung ke proxy.
      // =================================================================
      // ALUR YANG BENAR: Permintaan datang dari proxy maneh.blog.
      // Tugas kita adalah menyajikan halaman video (index.html) ke proxy.
      // =================================================================
      const asset = await env.ASSETS.fetch(new URL('/index.html', request.url));
      const response = new Response(asset.body, asset);
      
      // Set security headers
      Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    } else {
      // PENGUNJUNG LANGSUNG: Pengguna/bot membuka quaxy.my/v/?id=...
      // Di sini kita deteksi apakah pengunjungnya adalah bot atau manusia.
      const ua = request.headers.get("user-agent") || "";
      const isBot = BOT_PATTERNS.some((re) => re.test(ua));

      if (isBot) {
        // JIKA BOT: Alihkan ke halaman artikel kanonis untuk SEO & preview yang baik.
        return Response.redirect("https://maneh.blog/2025/09/19/1-optimasi-chatgpt-panduan-prompts", 302);
      } else {
        // JIKA MANUSIA: Alihkan ke platform utama dengan tracking
        const trackingParams = `?utm_source=videy&utm_medium=direct&video_id=${videoId}`;
        return Response.redirect(`https://maneh.blog/v/${videoId}${trackingParams}`, 302);
      }
    }
  }

  // Fallback assets dengan error handling
  try {
    return env.ASSETS.fetch(request);
  } catch (error) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: CACHE_HEADERS
    });
  }
}
