importScripts('../packages/appcache-polyfill-sw/build/index.js');

self.addEventListener('fetch', (event) => {
  event.respondWith(appcachePolyfill.handle(event));
});
