import type { NosamConfig } from './config.ts';

/** Define a typed Nosam project configuration without loading the Vite plugin. */
export function defineConfig<const T extends NosamConfig>(config: T): T {
  return config;
}

export type { NosamConfig } from './config.ts';
