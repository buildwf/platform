import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { loadBwfConfig } from '../../src/config-loader.ts';

/**
 * Coverage for the bwf.config.ts loader. jiti only aliases `@builtbyfriends/bwf/config`,
 * so tsconfig path aliases fail to resolve — they get detected and produce
 * the same hint as env.ts.
 */

const roots: Array<string> = [];

function createTempProject(config: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nosam-config-loader-'));
  roots.push(root);
  writeFileSync(join(root, 'bwf.config.ts'), config);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0, roots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('loadBwfConfig', () => {
  it('loads bwf.config.ts with relative imports', () => {
    const root = createTempProject(
      'import { defineConfig } from "@builtbyfriends/bwf/config";\n' +
        'import { SOURCE_DIR } from "./shared.ts";\n' +
        'export default defineConfig({ sourceDir: SOURCE_DIR });\n',
    );
    writeFileSync(join(root, 'shared.ts'), 'export const SOURCE_DIR = "src";\n');

    expect(loadBwfConfig(root)).toEqual({
      source: 'bwf.config.ts',
      value: { sourceDir: 'src' },
    });
  });

  it('gives a targeted hint when bwf.config.ts imports through a tsconfig path alias', () => {
    const root = createTempProject(
      'import { defineConfig } from "@builtbyfriends/bwf/config";\n' +
        'import { SOURCE_DIR } from "@/lib/shared";\n' +
        'export default defineConfig({ sourceDir: SOURCE_DIR });\n',
    );

    expect(() => loadBwfConfig(root)).toThrow(
      /Could not load bwf\.config\.ts.*Hint: '@\/lib\/shared' looks like a tsconfig path alias.*use a relative import/s,
    );
  });

  it('does not add the alias hint for a genuine missing bare package', () => {
    const root = createTempProject('import "@definitely-not-installed/pkg";\nexport default {};\n');

    expect(() => loadBwfConfig(root)).toThrow(/Could not load bwf\.config\.ts/);
    expect(() => loadBwfConfig(root)).not.toThrow(/tsconfig path alias/);
  });
});
