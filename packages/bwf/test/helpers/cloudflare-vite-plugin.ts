import type { Plugin } from 'vite';

export function cloudflare(pluginConfig: unknown): Array<Plugin> {
  return [{ name: 'mock:cloudflare', api: { pluginConfig } }];
}
