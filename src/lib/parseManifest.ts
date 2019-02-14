import {Manifest} from './interfaces';

export function parseManifest(
  rawManifest: string,
  baseUrl: string = location.href
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
