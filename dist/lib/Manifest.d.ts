export interface Manifest {
    cache: Array<string>;
    fallback: {
        [key: string]: string;
    };
    network: Array<string>;
    settings: Array<string>;
    unknown: Array<string>;
    [key: string]: any;
}
export declare function parse(rawManifest: string, baseUrl?: string): Manifest;
