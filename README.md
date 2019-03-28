## About

tk

## Installation

tk

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
