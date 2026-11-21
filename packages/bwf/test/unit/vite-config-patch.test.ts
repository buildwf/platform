import { describe, expect, it } from 'vite-plus/test';
import { patchViteConfigWithBwfPlugin } from '../../src/cli/vite-config-patch.ts';

describe('Vite config patching', () => {
  it('ignores plugin text in comments, strings, and regular expressions', () => {
    const source = `import { defineConfig } from 'vite';
// bwfPlugin()
const message = 'bwfPlugin()';
const pattern = /[{}]/;
export default defineConfig({ plugins: [other()] });
`;
    const updated = patchViteConfigWithBwfPlugin('vite.config.ts', source)!;
    expect(updated).toContain('plugins: [bwfPlugin(), other()]');
    expect(updated).toContain('const pattern = /[{}]/;');
    expect(updated).toContain('import { bwfPlugin } from "@builtbyfriends/bwf";');
    expect(patchViteConfigWithBwfPlugin('vite.config.ts', updated)).toBe(updated);
  });

  it('reuses an aliased import of bwfPlugin', () => {
    const source = `import { bwfPlugin as bwfVite } from '@builtbyfriends/bwf';
export default { plugins: [] };
`;
    const updated = patchViteConfigWithBwfPlugin('vite.config.ts', source)!;
    expect(updated).toContain('plugins: [bwfVite()]');
    expect(updated.match(/from '@builtbyfriends\/bwf'/g)).toHaveLength(1);
  });

  it('inserts an import after a multiline import declaration', () => {
    const source = `import {
  defineConfig,
} from 'vite';
export default defineConfig({});
`;
    const updated = patchViteConfigWithBwfPlugin('vite.config.ts', source)!;
    expect(updated).toContain(
      '} from \'vite\';\nimport { bwfPlugin } from "@builtbyfriends/bwf";\n',
    );
    expect(updated).toContain('plugins: [bwfPlugin()]');
  });

  it('leaves dynamic plugin properties for manual setup', () => {
    const source = `export default { plugins: getPlugins() }`;
    expect(patchViteConfigWithBwfPlugin('vite.config.ts', source)).toBeUndefined();
  });
});
