export async function fetchWithFallback(
  request: Request,
  fallbackUrl: string,
  cacheName: string
) {
  try {
    const response = await fetch(request);

    // Successful but error-like responses are treated as failures.
    // Ditto for redirects to other origins.
    if (!response.ok || (new URL(response.url).origin !== location.origin)) {
      throw Error('Fallback request failure.');
    }

    return response;
  } catch(e) {
    const cache = await caches.open(cacheName);
    return cache.match(fallbackUrl);
  }
}
