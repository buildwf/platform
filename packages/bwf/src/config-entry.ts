import type { BwfConfig } from './config.ts';

/** Define a typed bwf project configuration without loading the Vite plugin. */
export function defineConfig<const T extends BwfConfig>(config: T): T {
  return config;
}

export type { BwfConfig } from './config.ts';
