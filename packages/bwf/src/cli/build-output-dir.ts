import { existsSync } from 'node:fs';
import { join } from 'pathslash';

export function resolveDistDir(root: string): string {
  return join(root, 'dist');
}

export function resolveWorkerDirName(distDir: string): string {
  if (existsSync(join(distDir, 'ssr'))) {
    return 'ssr';
  }
  throw new Error('deploy: Worker output not found. Expected dist/ssr/.');
}
