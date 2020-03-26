## About

A pair of modules meant to ease the transition
[off of AppCache](https://alistapart.com/article/application-cache-is-a-douchebag/)
and on to
[service workers](https://developers.google.com/web/fundamentals/primers/service-workers/).

Note: These libraries attempt to replicate the caching and serving behavior that AppCache offers, but does **not** include equivalents to the [`window.applicationCache` interface](https://developer.mozilla.org/en-US/docs/Web/API/Window/applicationCache), nor the related events that AppCache would fire in the `window` context.

## Installation

There are two modules to install: one that is used from within the `window`
context in your web app, and the other that's used in the context of your
service worker.

```sh
npm install --save-dev appcache-polyfill-window
npm install --save-dev appcache-polyfill-sw
```

## Usage

### Window client

```html
<script type="module">
  import {init} from '/path/to/appcache-polyfill-window/build/index.mjs';
  init().then(() => navigator.serviceWorker.register('sw.js'));
</script>
```

### Service worker client

```js
importScripts('/path/to/appcache-polyfill-sw/build/index.umd.js');

self.addEventListener('fetch', (event) => {
  // Alternatively, examine event.request and only use the appcachePolyfill.handle()
  // logic for a subset of requests.
  event.respondWith(appcachePolyfill.handle(event));
});
```

## Feedback

This project is still a work in progress. Please experiment with it on a
non-production version of your site, and [open issues](https://github.com/googlechromelabs/sw-appcache-behavior/issues)
with feedback or bug reports if you run in to problems.
