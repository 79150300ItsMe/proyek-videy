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

    const destinationUrl = new URL(`/v/?id=${encodeURIComponent(videoId)}`, url);
    return Response.redirect(destinationUrl.toString(), 302);
  }

  // Handler untuk /v/
  if (url.pathname === "/v/") {
    // Cek apakah ini permintaan dari reverse proxy kita di maneh.blog
    const isProxyRequest = request.headers.get("X-Proxy-Request") === "true";

    if (isProxyRequest) {
      // Jika ya, sajikan konten videy.html secara langsung ke proxy.
      // Header Cache-Control penting agar logika reload di client (jika ada) tetap andal.
      const asset = await env.ASSETS.fetch(new URL('/videy.html', request.url));
      const response = new Response(asset.body, asset);
      response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      return response;
    } else {
      // Jika tidak, ini adalah pengunjung langsung. Alihkan ke URL kanonis di maneh.blog.
      // Ini menyederhanakan logika karena bot dan pengguna diperlakukan sama (di-redirect).
      return Response.redirect("https://maneh.blog/p/perang-dingin-digital-keamanan-siber", 302);
    }
  }

  // Fallback assets
  return env.ASSETS.fetch(request);
}
