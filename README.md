# sw-appcache-behavior

[![Build Status](https://travis-ci.org/GoogleChrome/sw-appcache-behavior.svg?branch=master)](https://travis-ci.org/GoogleChrome/sw-appcache-behavior)

A service worker implementation of the behavior defined in a page's App Cache manifest.

## Installation

`npm install --save-dev sw-appcache-behavior`

## Usage

A service worker implementation of the behavior defined in a page's App Cache manifest.

In your web page you need to add the client-runtime.js file:

```
<script src="../build/client-runtime.js"
   data-service-worker="service-worker.js"></script>
```

Then in your service worker you must import the appcache-behavior-import.js file:

```
importScripts('../build/appcache-behavior-import.js');

self.addEventListener('fetch', (event) => {
  event.respondWith(goog.appCacheBehavior.fetch(event));
});
```

## Demo

Browse sample source code in the [demo directory](https://github.com/GoogleChrome/sw-appcache-behavior/tree/master/demo).
