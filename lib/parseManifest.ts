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

import {Manifest} from './interfaces';

export function parseManifest(
    rawManifest: string,
    baseUrl: string = location.href,
) {
  const manifest: Manifest = {
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
      const [key, value] = line.split(/\s+/, 2).map(
          (url) => (new URL(url, baseUrl)).href);
      manifest.fallback[key] = value;
    } else {
      if (currentMode === 'network' && line === '*') {
        manifest.network.push('*');
      } else {
        manifest[currentMode].push((new URL(line, baseUrl)).href);
      }
    }
  }

  return manifest;
}
