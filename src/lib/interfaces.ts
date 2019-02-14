export interface Manifest {
  cache: Array<string>,
  fallback: {
    [key: string]: string;
  },
  network: Array<string>,
  settings: Array<string>,
  unknown: Array<string>,
  [key: string]: any;
}

export interface ManifestURLToHashes {
  [key: string]: HashToManifest,
}

export interface HashToManifest {
  [key: string]: Manifest,
}

export interface PageURLToManifestURL {
  [key: string]: string,
}
