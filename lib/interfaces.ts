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

export interface CachePopulatedCallback {
  (urlsCached: Array<string>): void;
}
