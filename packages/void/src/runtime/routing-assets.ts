import type { RuntimeEnvironment } from './routing-worker.ts';

// `c.rewrite()` cannot reach files the asset layer serves. `.html` is excluded: routes may use it.
export const ASSET_EXTENSIONS: Array<string> = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'svg',
  'ico',
  'css',
  'js',
  'mjs',
  'cjs',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'mp4',
  'webm',
  'mp3',
  'wav',
  'pdf',
  'txt',
  'xml',
  'json',
  'wasm',
  'map',
];

export type ClientManifest = Record<
  string,
  {
    file?: string;
    imports?: Array<string>;
    css?: Array<string>;
    /** Build-proven fingerprinted outputs; absent in older/third-party manifests. */
    immutableFiles?: Array<string>;
  }
>;
export type ManifestLoader = (
  request: Request,
  env: RuntimeEnvironment,
) => Promise<ClientManifest | null>;
export function createManifestLoader(): ManifestLoader {
  let cached: ClientManifest | null = null;
  let pending: Promise<ClientManifest | null> | null = null;
  return async (request, env) => {
    if (cached) {
      return cached;
    }
    const injected = (globalThis as typeof globalThis & { __VITE_MANIFEST__?: unknown })
      .__VITE_MANIFEST__;
    if (typeof injected === 'object' && injected) {
      cached = injected as ClientManifest;
      return cached;
    }
    const assets = env?.ASSETS;
    if (!assets || typeof assets.fetch !== 'function') {
      return null;
    }
    // Concurrent cold requests share one fetch and parse. A missing or failed
    // manifest is not cached, so a later request retries.
    pending ??= (async () => {
      const response = await assets.fetch(
        new Request(new URL('/.vite/manifest.json', request.url).toString()),
      );
      if (!response.ok) {
        return null;
      }
      cached = (await response.json()) as ClientManifest;
      return cached;
    })().finally(() => {
      pending = null;
    });
    return pending;
  };
}
