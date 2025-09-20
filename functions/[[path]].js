import videoIds from './video-ids.js';

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
    const videoId = url.searchParams.get('id');

    // Validasi: Cek apakah ID ada di dalam daftar yang valid
    if (!videoId || !videoIds.includes(videoId)) {
      return new Response("ID Video tidak valid atau tidak ditemukan.", {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
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
      response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      return response;
    } else {
      // =================================================================
      // PENGUNJUNG LANGSUNG: Pengguna membuka quaxy.my/v/?id=...
      // Tugas kita adalah mengalihkan mereka ke "pintu masuk" yang benar
      // di domain maneh.blog, yang kemudian akan mem-proxy konten ini.
      // =================================================================
      return Response.redirect(`https://maneh.blog/v/${videoId}`, 302);
    }
  }

  // Fallback assets
  return env.ASSETS.fetch(request);
}
