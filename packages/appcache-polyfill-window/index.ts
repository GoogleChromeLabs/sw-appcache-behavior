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

import {getHash} from '../../lib/getHash';
import {parseManifest} from '../../lib/parseManifest';
import * as storage from '../../lib/storageWithDefault';

import {
  Manifest,
  ManifestURLToHashes,
  PageURLToManifestURL,
} from '../../lib/interfaces';

export async function init() {
  const manifestAttribute = document.documentElement.getAttribute('manifest');
  if (manifestAttribute && 'serviceWorker' in navigator) {
    const manifestUrl = (new URL(manifestAttribute, location.href)).href;

    const hash = await checkManifestVersion(manifestUrl);
    await updateManifestAssociationForCurrentPage(manifestUrl, hash);
  }
}

async function addToCache(hash: string, urls: Array<string>) {
  const cache = await caches.open(hash);

  await Promise.all(urls.map(async (url) => {
    // See Item 18.3 of https://html.spec.whatwg.org/multipage/browsers.html#downloading-or-updating-an-application-cache
    const init: RequestInit = {
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
        await cache.put(url, response);
        return;
      }

      // See Item 18.5 of https://html.spec.whatwg.org/multipage/browsers.html#downloading-or-updating-an-application-cache
      if (response.status !== 404 && response.status !== 410) {
        // Assuming this isn't a 200, 404 or 410, we want the catch to
        // trigger, which will cause any previously cached Response for this
        // URL to be copied over to this new cache.
        throw new Error(`Bad status: ${response.status}`);
      }
    } catch (e) {
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

async function checkManifestVersion(manifestUrl: string) {
  // See Item 4 of https://html.spec.whatwg.org/multipage/browsers.html#downloading-or-updating-an-application-cache
  const init: RequestInit = {
    credentials: 'include',
    headers: [['X-Use-Fetch', 'true']],
  };
  const manifestRequest = new Request(manifestUrl, init);

  let manifestResponse = await fetch(manifestRequest);
  // See Item 6 of https://html.spec.whatwg.org/multipage/offline.html#downloading-or-updating-an-application-cache
  if (manifestResponse.status === 404 || manifestResponse.status === 410) {
    // TODO: Implement the following:
    // Mark cache group as obsolete. This cache group no longer exists for any purpose other than the processing of Document objects already associated with an application cache in the cache group.
    throw new Error('Cache group obsolete');
  }

  // See https://html.spec.whatwg.org/multipage/offline.html#cache-failure-steps
  if (manifestResponse.status !== 200) {
    // TODO: Implement the following:
    throw new Error('Cache failure.');
  }

  const dateHeaderValue = manifestResponse.headers.get('date');
  if (dateHeaderValue) {
    const manifestDate = new Date(dateHeaderValue).valueOf();
    // Calculate the age of the manifest in milliseconds.
    const manifestAgeInMillis = Date.now() - manifestDate;

    // If the age is greater than 24 hours, then we need to fetch without
    // hitting the cache.
    if (manifestAgeInMillis > (24 * 60 * 60 * 1000)) {
      const noCacheInit: RequestInit = {
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

  const manifestURLToHashes: ManifestURLToHashes =
      await storage.get('ManifestURLToHashes');
  const hashesToManifest =
      manifestURLToHashes[manifestUrl] || new Map<string, Manifest>();

  // If we already have an entry for this version of the manifest, we can
  // return without updating anything.
  for (const knownHash of Object.keys(hashesToManifest)) {
    if (knownHash === hash) {
      return hash;
    }
  }

  // If the hash of the manifest retrieved from the network isn't already
  // in the list of known manifest hashes, then update things.
  const parsedManifest = parseManifest(manifestContents);

  hashesToManifest.set(hash, parsedManifest);
  manifestURLToHashes[manifestUrl] = hashesToManifest;
  await storage.set('ManifestURLToHashes', manifestURLToHashes);

  await cacheManifestURLs(manifestUrl, hash, parsedManifest);

  return hash;
}

async function cacheManifestURLs(
    currentManifestURL: string,
    hash: string,
    parsedManifest: Manifest
) {
  const fallbackUrls = Object.values(parsedManifest.fallback);
  const urlsToCache = parsedManifest.cache.concat(fallbackUrls);

  const pageURLToManifestURL: PageURLToManifestURL =
      await storage.get('PageURLToManifestURL');

  for (const [pageURL, savedURL] of Object.entries(pageURLToManifestURL)) {
    if (currentManifestURL === savedURL) {
      urlsToCache.push(pageURL);
    }
  }

  await addToCache(hash, urlsToCache);

  return parsedManifest;
}

async function updateManifestAssociationForCurrentPage(
    manifestUrl: string,
    hash: string
) {
  const pageURLToManifestURL: PageURLToManifestURL =
      await storage.get('PageURLToManifestURL');
  pageURLToManifestURL[location.href] = manifestUrl;

  await Promise.all([
    storage.set('PageURLToManifestURL', pageURLToManifestURL),
    addToCache(hash, [location.href]),
  ]);
}
