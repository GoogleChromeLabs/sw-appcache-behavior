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

export type HashToManifest = Map<string, Manifest>

export interface PageURLToManifestURL {
  [key: string]: string,
}

export interface ClientIdToHash {
  [key: string]: string,
}
