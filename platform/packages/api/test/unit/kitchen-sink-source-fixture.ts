import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function kitchenSinkSourceFixture(files: Array<string>) {
  const workspace = fileURLToPath(new URL('../../../../../', import.meta.url));
  // Decision: The temp root stays under the API package so the public Platform imports resolve through its
  // installed workspace dependency, including on a package-only CI build.
  const root = mkdtempSync(join(import.meta.dirname, '.tmp-kitchen-sink-source-'));
  try {
    writeFileSync(join(root, 'tsconfig.json'), '{}');
    for (const file of files) {
      const target = join(root, file);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(workspace, 'playground/kitchen-sink', file), target);
    }
    return {
      root,
      cleanup: () => rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 50 }),
    };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
