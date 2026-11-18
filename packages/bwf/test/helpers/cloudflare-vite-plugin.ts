import type { Plugin } from 'vite';

/** Stand-in for bwf’s Cloudflare bridge: exposes the options bwf passes as `api.pluginConfig`. */
export function cloudflare(pluginConfig: unknown): Array<Plugin> {
  return [{ name: 'mock:cloudflare', api: { pluginConfig } }];
}
