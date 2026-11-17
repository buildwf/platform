import type { Plugin } from 'vite';

/** Stand-in for Nosam’s Cloudflare bridge: exposes the options Nosam passes as `api.pluginConfig`. */
export function cloudflare(pluginConfig: unknown): Array<Plugin> {
  return [{ name: 'mock:cloudflare', api: { pluginConfig } }];
}
