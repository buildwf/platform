import { existsSync } from 'node:fs';
import { join } from 'pathslash';

/** Resolve the top-level build output directory of a Nosam app. */
export function resolveDistDir(root: string): string {
  return join(root, 'dist');
}

/** Resolve the worker output subdirectory within the build dir. */
export function resolveWorkerDirName(distDir: string): string {
  if (existsSync(join(distDir, 'ssr'))) {
    return 'ssr';
  }
  throw new Error('deploy: Worker output not found. Expected dist/ssr/.');
}
