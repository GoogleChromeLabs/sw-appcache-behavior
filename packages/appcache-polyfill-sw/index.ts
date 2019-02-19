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

/// <reference path="../../node_modules/types-serviceworker/index.d.ts" />
/// <reference lib="esnext" />

import * as storage from 'idb-keyval';

import {fetchWithFallback} from '../../lib/fetchWithFallback';
import {longestMatchingPrefix} from '../../lib/longestMatchingPrefix';

import {
  ClientIdToHash,
  Manifest,
  ManifestURLToHashes,
} from '../../lib/interfaces';

async function getClientUrlForEvent(event: FetchEvent) {
  try {
    // TODO: I have no idea if this is the right precedence.
    const effectiveClientId =
      event.replacesClientId || event.resultingClientId || event.clientId;
    const client = await self.clients.get(effectiveClientId);
    return client.url;
  } catch(e) {
    // Firefox currently sets the referer to 'about:client' for initial
    // navigations, but that's not useful for our purposes.
    if (event.request.referrer && event.request.referrer !== 'about:client') {
      return event.request.referrer;
    }

    // Use the event's request URL as the last resort, with the assumption
    // that this is a navigation request and we can't detect it otherwise.
    return event.request.url;
  }
}

async function getLatestManifestVersion(manifestUrl: string) {
  const manifestURLToHashes: ManifestURLToHashes = await storage.get('ManifestURLToHashes');
  if (!manifestURLToHashes) {
    return;
  }

  const hashesToManifest = manifestURLToHashes[manifestUrl];
  if (!hashesToManifest) {
    return;
  }

  const hashes = [...hashesToManifest.keys()];
  // Map objects preserve the ordering of insertion, so the last key will be the
  // most recent hash.
  return hashes[hashes.length - 1];
}

async function getManifestWithHash(manifestUrl: string, hash: string) {
  const manifestURLToHashes: ManifestURLToHashes = (await storage.get('ManifestURLToHashes') || {});

  const hashToManifest = manifestURLToHashes[manifestUrl];
  if (!hashToManifest) {
    return;
  }

  return hashToManifest.get(hash);
}

async function saveClientIdAndHash(clientId: string, hash: string) {
  if (clientId) {
    const clientIdToHash: ClientIdToHash = (await storage.get('ClientIdToHash') || {});
    clientIdToHash[clientId] = hash;
    await storage.set('ClientIdToHash', clientIdToHash);
  }
}

async function appCacheLogic(
  event: FetchEvent,
  manifest: Manifest,
  hash: string,
  clientUrl: string
) {
  const requestUrl = event.request.url;

  // Is our request URL listed in the CACHES section?
  // Or is our request URL the client URL, since any page that
  // registers a manifest is treated as if it were in the CACHE?
  if (manifest.cache.includes(requestUrl) || (requestUrl === clientUrl)) {
    // If so, return the cached response.
    const cache = await caches.open(hash);
    return cache.match(requestUrl);
  }

  // Otherwise, check the FALLBACK section next.
  // FALLBACK keys are URL prefixes, and if more than one prefix
  // matches our request URL, the longest prefix "wins".
  // (Of course, it might be that none of the prefixes match.)
  const fallbackKey = longestMatchingPrefix(Object.keys(manifest.fallback),
    requestUrl);
  if (fallbackKey) {
    return fetchWithFallback(event.request, manifest.fallback[fallbackKey],
      hash);
  }

  // If CACHE and FALLBACK don't apply, try NETWORK.
  if (manifest.network.includes(requestUrl) ||
      manifest.network.includes('*')) {
    return fetch(event.request);
  }

  // If nothing matches, then return an error response.
  return Response.error();
}

async function manifestBehavior(
  event: FetchEvent,
  manifestUrl: string,
  clientUrl: string
) {
  if (event.clientId) {
    const clientIdToHash: ClientIdToHash = (await storage.get('ClientIdToHash') || {});
    const hash = clientIdToHash[event.clientId];

    // If we already have a hash assigned to this client id, use the associated
    // manifest to implement the AppCache logic.
    if (hash) {
      const manifest = await getManifestWithHash(manifestUrl, hash);
      if (manifest) {
        return appCacheLogic(event, manifest, hash, clientUrl);
      }
    }
  }

  // If there's isn't yet a hash for this client id, or there's no client id,
  // then get the latest version of the manifest, and use that to implement
  // AppCache logic.
  const latestHash = await getLatestManifestVersion(manifestUrl);
  if (latestHash) {
    // Establish the clientId-to-hash mapping for future use.
    if (event.clientId) {
      await saveClientIdAndHash(event.clientId, latestHash);
    }

    const manifest = await getManifestWithHash(manifestUrl, latestHash);
    if (manifest) {
      return appCacheLogic(event, manifest, latestHash, clientUrl);
    }
  }

  // If we don't have a matching manifest, return an error response.
  return Response.error();
}

async function noManifestBehavior(event: FetchEvent) {
  // If we fall through to this point, then we don't have a known
  // manifest associated with the client making the request.
  // We now need to check to see if our request URL matches a prefix
  // from the FALLBACK section of *any* manifest in our origin. If
  // there are multiple matches, the longest prefix wins. If there are
  // multiple prefixes of the same length in different manifest, then
  // the one we access last wins. (This might not match browser behavior.)
  // See https://www.w3.org/TR/2011/WD-html5-20110525/offline.html#concept-appcache-matches-fallback
  const manifestUrls = (await storage.get('ManifestURLToHashes') || {});
  return idbHelpers[constants.STORES.MANIFEST_URL_TO_CONTENTS].getAllValues()
    .then((manifests) => {
      logHelper.log('All manifests:', manifests);
      // Use .map() to create an array of the longest matching prefix
      // for each manifest. If no prefixes match for a given manifest,
      // the value will be ''.
      const longestForEach = manifests.map((manifestVersions) => {
        // Use the latest version of a given manifest.
        const parsedManifest =
          manifestVersions[manifestVersions.length - 1].parsed;
        return longestMatchingPrefix(
          Object.keys(parsedManifest.fallback), event.request.url);
      });
      logHelper.log('longestForEach:', longestForEach);

      // Next, find which of the longest matching prefixes from each
      // manifest is the longest overall. Return both the index of the
      // manifest in which that match appears and the prefix itself.
      const longest = longestForEach.reduce((soFar, current, i) => {
        if (current.length >= soFar.prefix.length) {
          return {prefix: current, index: i};
        }

        return soFar;
      }, {prefix: '', index: 0});
      logHelper.log('longest:', longest);

      // Now that we know the longest overall prefix, we'll use that
      // to lookup the fallback URL value in the winning manifest.
      const fallbackKey = longest.prefix;
      logHelper.log('fallbackKey:', fallbackKey);
      if (fallbackKey) {
        const winningManifest = manifests[longest.index];
        logHelper.log('winningManifest:', winningManifest);
        const winningManifestVersion =
          winningManifest[winningManifest.length - 1];
        logHelper.log('winningManifestVersion:', winningManifestVersion);
        const hash = winningManifestVersion.hash;
        const parsedManifest = winningManifestVersion.parsed;
        return fetchWithFallback(event.request,
          parsedManifest.fallback[fallbackKey], hash);
      }

      // If nothing matches, then just fetch().
      logHelper.log('Nothing at all matches. Using fetch()');
      return fetch(event.request);
    });
}

/**
 * An attempt to mimic AppCache behavior, using the primitives available to
 * a service worker.
 *
 * @private
 * @param {FetchEvent} event
 * @return {Promise.<Response>}
 */
function appCacheBehaviorForEvent(event) {
  const requestUrl = new URL(event.request.url);
  logHelper.log('Starting appCacheBehaviorForUrl for ' + requestUrl);

  // If this is a request that, as per the AppCache spec, should be handled
  // via a direct fetch(), then do that and bail early.
  if (event.request.headers.get('X-Use-Fetch') === 'true') {
    logHelper.log('Using fetch() because X-Use-Fetch: true');
    return fetch(event.request);
  }

  // Appcache rules only apply to GETs & same-scheme requests.
  if (event.request.method !== 'GET' ||
      requestUrl.protocol !== location.protocol) {
    logHelper.log(
      'Using fetch() because AppCache does not apply to this request.');
    return fetch(event.request);
  }

  return getClientUrlForEvent(event).then((clientUrl) => {
    logHelper.log('clientUrl is', clientUrl);
    return idbHelpers[constants.STORES.PATH_TO_MANIFEST].get(clientUrl)
      .then((manifestUrl) => {
        logHelper.log('manifestUrl is', manifestUrl);

        if (manifestUrl) {
          return manifestBehavior(event, manifestUrl, clientUrl);
        }

        logHelper.log('No matching manifest for client found.');
        return noManifestBehavior(event);
      });
  });
}

/**
 * Given a list of client ids that are still active, this:
 * 1. Gets a list of all the client ids in IndexedDB's CLIENT_ID_TO_HASH
 * 2. Filters them to remove the active ones
 * 3. Delete the inactive entries from IndexedDB's CLIENT_ID_TO_HASH
 * 4. For each inactive one, return the corresponding hash association.
 *
 * @private
 * @param {Array.<String>} idsOfActiveClients
 * @return {Promise.<Array.<String>>}
 */
function cleanupClientIdAndHash(idsOfActiveClients) {
  return idbHelpers[constants.STORES.CLIENT_ID_TO_HASH].getAllKeys()
    .then((allKnownIds) => {
      return allKnownIds.filter((id) => !idsOfActiveClients.includes(id));
    }).then((idsOfInactiveClients) => {
      return Promise.all(idsOfInactiveClients.map((id) => {
        const storeName = constants.STORES.CLIENT_ID_TO_HASH;
        return idbHelpers[storeName].get(id).then((hash) => {
          return idbHelpers[constants.STORES.CLIENT_ID_TO_HASH].delete(id)
            .then(() => hash);
        });
      }));
    });
}

/**
 * Fulfills with an array of all the hash ids that correspond to outdated
 * manifest versions.
 *
 * @private
 * @return {Promise.<Array.<String>>}
 */
function getHashesOfOlderVersions() {
  return idbHelpers[constants.STORES.MANIFEST_URL_TO_CONTENTS].getAllValues()
    .then((manifests) => {
      return manifests.map((versions) => {
        // versions.slice(0, -1) will give all the versions other than the
        // last, or [] if there's aren't any older versions.
        return versions.slice(0, -1).map((version) => version.hash);
      }).reduce((prev, curr) => {
        // Flatten the array-of-arrays into an array.
        return prev.concat(curr);
      }, []);
    });
}

/**
 * Does the following:
 * 1. Gets a list of all client ids associated with this service worker.
 * 2. Calls cleanupClientIdAndHash() to remove the out of date client id
 *    to hash associations.
 * 3. Calls getHashesOfOlderVersions() to get a list of all the hashes
 *    that correspond to out-of-date manifest versions.
 * 4. If there's a match between an out of date hash and a hash that is no
 *    longer being used by a client, then it deletes the corresponding cache.
 *
 * @private
 */
function cleanupOldCaches() {
  self.clients.matchAll().then((clients) => {
    return clients.map((client) => client.id);
  }).then((idsOfActiveClients) => {
    return cleanupClientIdAndHash(idsOfActiveClients);
  }).then((hashesNotInUse) => {
    return getHashesOfOlderVersions().then((hashesOfOlderVersions) => {
      return hashesOfOlderVersions.filter((hashOfOlderVersion) => {
        return hashesNotInUse.includes(hashOfOlderVersion);
      });
    });
  }).then((idsToDelete) => {
    logHelper.log('deleting cache ids', idsToDelete);
    return Promise.all(idsToDelete.map((cacheId) => caches.delete(cacheId)));
  });

  // TODO: Delete the entry in the array stored in MANIFEST_URL_TO_CONTENT.
}

/**
 * `goog.appCacheBehavior.fetch` is the main entry point to the library
 * from within service worker code.
 *
 * The goal of the library is to provide equivalent behavior to AppCache
 * whenever possible. The one difference in how this library behaves compared to
 * a native AppCache implementation is that its client-side code will attempt to
 * fetch a fresh AppCache manifest once any cached version is older than 24
 * hours. This works around a
 * [major pitfall](http://alistapart.com/article/application-cache-is-a-douchebag#section6)
 * in the native AppCache implementation.
 *
 * **Important**
 * In addition to calling `goog.appCacheBehavior.fetch()` from within your
 * service worker, you *must* add the following to each HTML document that
 * contains an App Cache Manifest:
 *
 * ```html
 * <script src="path/to/client-runtime.js"
 *         data-service-worker="service-worker.js">
 * </script>
 * ```
 *
 * (The `data-service-worker` attribute is optional. If provided, it will
 * automatically call
 * [`navigator.serviceWorker.register()`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)
 * for you.)
 *
 * Once you've added `<script src="path/to/client-runtime.js"></script>` to
 * your HTML pages, you can use `goog.appCacheBehavior.fetch` within your
 * service worker script to get a `Response` suitable for passing to
 * [`FetchEvent.respondWidth()`](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith):
 *
 * ```js
 * // Import the library into the service worker global scope:
 * // https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts
 * importScripts('path/to/appcache-behavior-import.js');
 *
 * self.addEventListener('fetch', event => {
 *   event.respondWith(goog.appCacheBehavior.fetch(event).catch(error => {
 *     // Fallback behavior goes here, e.g. return fetch(event.request);
 *   }));
 * });
 * ```
 *
 * `goog.appCacheBehavior.fetch()` can be selectively applied to only a subset
 * of requests, to aid in the migration off of App Cache and onto a more
 * robust service worker implementation:
 *
 * ```js
 * // Import the library into the service worker global scope:
 * // https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts
 * importScripts('path/to/appcache-behavior-import.js');
 *
 * self.addEventListener('fetch', event => {
 *   if (event.request.url.match(/legacyRegex/)) {
 *     event.respondWith(goog.appCacheBehavior.fetch(event));
 *   } else {
 *     event.respondWith(goog.appCacheBehavior.fetch(event));
 *   }
 * });
 * ```
 *
 * @alias goog.appCacheBehavior.fetch
 * @param {FetchEvent} event
 * @return {Promise.<Response>}
 */
function fetchBehavior(event) {
  logHelper.log('client id is', event.clientId);
  return appCacheBehaviorForEvent(event).then((response) => {
    // If this is a navigation, clean up unused caches that correspond to old
    // AppCache manifest versions which are no longer associated with an
    // active client. This will be done asynchronously, and won't block the
    // response from being returned to the onfetch handler.
    if (event.request.mode === 'navigate') {
      cleanupOldCaches();
    }

    return response;
  });
}

export {fetchBehavior as fetch};
