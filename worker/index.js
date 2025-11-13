const HASHED_ASSET_REGEX = /\/assets\/.+-[A-Za-z0-9]{8,}\.[a-z0-9]+$/;

// Cloudflare Worker that serves the built Vite assets from the dist folder.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Try to serve the requested asset directly first.
    let response = await env.ASSETS.fetch(request);

    // For SPA routes without file extensions, fall back to index.html.
    if (response.status === 404 && shouldServeSPA(url, request)) {
      const indexRequest = new Request(new URL('/index.html', url.origin), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    if (response.status === 404) {
      return response;
    }

    return withHeaders(response, url);
  }
};

function shouldServeSPA(url, request) {
  const isHtmlRequest =
    request.headers.get('accept')?.includes('text/html') ?? false;
  const looksLikeFile = url.pathname.split('/').pop()?.includes('.') ?? false;
  return request.method === 'GET' && isHtmlRequest && !looksLikeFile;
}

function withHeaders(response, url) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const cacheControl = HASHED_ASSET_REGEX.test(url.pathname)
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=300';
  headers.set('Cache-Control', cacheControl);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
