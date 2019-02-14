(function () {
    'use strict';

    class Store {
        constructor(dbName = 'keyval-store', storeName = 'keyval') {
            this.storeName = storeName;
            this._dbp = new Promise((resolve, reject) => {
                const openreq = indexedDB.open(dbName, 1);
                openreq.onerror = () => reject(openreq.error);
                openreq.onsuccess = () => resolve(openreq.result);
                // First time setup: create an empty object store
                openreq.onupgradeneeded = () => {
                    openreq.result.createObjectStore(storeName);
                };
            });
        }
        _withIDBStore(type, callback) {
            return this._dbp.then(db => new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, type);
                transaction.oncomplete = () => resolve();
                transaction.onabort = transaction.onerror = () => reject(transaction.error);
                callback(transaction.objectStore(this.storeName));
            }));
        }
    }
    let store;
    function getDefaultStore() {
        if (!store)
            store = new Store();
        return store;
    }
    function get(key, store = getDefaultStore()) {
        let req;
        return store._withIDBStore('readonly', store => {
            req = store.get(key);
        }).then(() => req.result);
    }
    function set(key, value, store = getDefaultStore()) {
        return store._withIDBStore('readwrite', store => {
            store.put(value, key);
        });
    }

    // See https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#Converting_a_digest_to_a_hex_string
    function hexString(buffer) {
        const byteArray = new Uint8Array(buffer);
        return [...byteArray].map(value => {
            const hexCode = value.toString(16);
            const paddedHexCode = hexCode.padStart(2, '0');
            return paddedHexCode;
        }).join('');
    }
    async function getHash(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return hexString(hash);
    }

    function parse(rawManifest, baseUrl = location.href) {
        const manifest = {
            cache: [],
            fallback: {},
            network: [],
            settings: [],
            unknown: [],
        };
        const trimmedLines = rawManifest.split('\n').map((line) => line.trim());
        const modes = new Map([
            ['CACHE:', 'cache'],
            ['NETWORK:', 'network'],
            ['FALLBACK:', 'fallback'],
            ['SETTINGS:', 'settings'],
        ]);
        let currentMode = 'cache';
        for (const line of trimmedLines) {
            if (line.startsWith('CACHE MANIFEST') ||
                line.startsWith('#') ||
                line === '') {
                continue;
            }
            if (line.endsWith(':')) {
                currentMode = modes.get(line) || 'unknown';
                continue;
            }
            if (currentMode === 'fallback') {
                const [key, value] = line.split(/\s+/, 2).map((url) => (new URL(url, baseUrl)).href);
                manifest.fallback[key] = value;
            }
            else {
                if (currentMode === 'network' && line === '*') {
                    manifest.network.push('*');
                }
                else {
                    manifest[currentMode].push((new URL(line, baseUrl)).href);
                }
            }
        }
        return manifest;
    }

    /*
     Copyright 2019 Google Inc. All Rights Reserved.
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License.
    */
    async function init() {
        const manifestAttribute = document.documentElement.getAttribute('manifest');
        if (manifestAttribute && 'serviceWorker' in navigator) {
            const manifestUrl = (new URL(manifestAttribute, location.href)).href;
            const hash = await checkManifestVersion(manifestUrl);
            await updateManifestAssociationForCurrentPage(manifestUrl, hash);
        }
    }
    async function addToCache(hash, urls) {
        const cache = await caches.open(hash);
        await Promise.all(urls.map(async (url) => {
            // See Item 18.3 of https://html.spec.whatwg.org/multipage/browsers.html#downloading-or-updating-an-application-cache
            const init = {
                credentials: 'include',
                headers: [['X-Use-Fetch', 'true']],
                redirect: 'manual',
            };
            const request = new Request(url, init);
            try {
                const response = await fetch(request);
                const cacheControl = response.headers.get('Cache-Control');
                if (cacheControl && cacheControl.includes('no-store')) {
                    // Bail early if we're told not to cache this response.
                    return;
                }
                if (response.status === 200) {
                    return await cache.put(url, response);
                }
                // See Item 18.5 of https://html.spec.whatwg.org/multipage/browsers.html#downloading-or-updating-an-application-cache
                if (response.status !== 404 && response.status !== 410) {
                    // Assuming this isn't a 200, 404 or 410, we want the catch to
                    // trigger, which will cause any previously cached Response for this
                    // URL to be copied over to this new cache.
                    throw new Error(`Bad status: ${response.status}`);
                }
            }
            catch (e) {
                // We're here if one of the following happens:
                // - The fetch() rejected due to a NetworkError.
                // - The HTTP status code from the fetch() was something other than
                //   200, 404, and 410 AND the response isn't Cache-Control: no-store
                const response = await caches.match(url);
                if (response) {
                    await cache.put(url, response);
                }
            }
        }));
    }
    async function checkManifestVersion(manifestUrl) {
        // See Item 4 of https://html.spec.whatwg.org/multipage/browsers.html#downloading-or-updating-an-application-cache
        const init = {
            credentials: 'include',
            headers: [['X-Use-Fetch', 'true']],
        };
        const manifestRequest = new Request(manifestUrl, init);
        let manifestResponse = await fetch(manifestRequest);
        const dateHeaderValue = manifestResponse.headers.get('date');
        if (dateHeaderValue) {
            const manifestDate = new Date(dateHeaderValue).valueOf();
            // Calculate the age of the manifest in milliseconds.
            const manifestAgeInMillis = Date.now() - manifestDate;
            // If the age is greater than 24 hours, then we need to fetch without
            // hitting the cache.
            if (manifestAgeInMillis > (24 * 60 * 60 * 1000)) {
                const noCacheInit = {
                    cache: 'reload',
                    credentials: 'include',
                    headers: [['X-Use-Fetch', 'true']],
                };
                const noCacheRequest = new Request(manifestUrl, noCacheInit);
                manifestResponse = await fetch(noCacheRequest);
            }
        }
        const manifestContents = await manifestResponse.text();
        const hash = await getHash(manifestUrl + manifestContents);
        const manifestURLToHashes = (await get('ManifestURLToHashes') || {});
        const hashesToManifest = manifestURLToHashes[manifestUrl] || {};
        // If we already have an entry for this version of the manifest, we can
        // return without updating anything.
        for (const knownHash of Object.keys(hashesToManifest)) {
            if (knownHash === hash) {
                return hash;
            }
        }
        // If the hash of the manifest retrieved from the network isn't already
        // in the list of known manifest hashes, then update things.
        const parsedManifest = parse(manifestContents);
        hashesToManifest[hash] = parsedManifest;
        manifestURLToHashes[manifestUrl] = hashesToManifest;
        await set('ManifestURLToHashes', manifestURLToHashes);
        await cacheManifestURLs(manifestUrl, hash, parsedManifest);
        return hash;
    }
    async function cacheManifestURLs(currentManifestURL, hash, parsedManifest) {
        const fallbackUrls = Object.values(parsedManifest.fallback);
        const urlsToCache = parsedManifest.cache.concat(fallbackUrls);
        const pageURLToManifestURL = (await get('PageURLToManifestURL') || {});
        for (const [pageURL, savedManifestURL] of Object.entries(pageURLToManifestURL)) {
            if (currentManifestURL === savedManifestURL) {
                urlsToCache.push(pageURL);
            }
        }
        await addToCache(hash, urlsToCache);
        return parsedManifest;
    }
    async function updateManifestAssociationForCurrentPage(manifestUrl, hash) {
        const pageURLToManifestURL = (await get('PageURLToManifestURL') || {});
        pageURLToManifestURL[location.href] = manifestUrl;
        await Promise.all([
            set('PageURLToManifestURL', pageURLToManifestURL),
            addToCache(hash, [location.href]),
        ]);
    }
    init();

}());
