importScripts('../../packages/appcache-polyfill-sw/build/index.umd.js');

self.addEventListener('fetch', (event) => {
  event.respondWith(
      appcachePolyfill.handle(event)
  );
});
