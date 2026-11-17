import { describe, expect, it } from 'vite-plus/test';
import { patchViteConfigWithNosamPlugin } from '../../src/cli/vite-config-patch.ts';

describe('Vite config patching', () => {
  it('ignores plugin text in comments, strings, and regular expressions', () => {
    const source = `import { defineConfig } from 'vite';
// nosamPlugin()
const message = 'nosamPlugin()';
const pattern = /[{}]/;
export default defineConfig({ plugins: [other()] });
`;
    const updated = patchViteConfigWithNosamPlugin('vite.config.ts', source)!;
    expect(updated).toContain('plugins: [nosamPlugin(), other()]');
    expect(updated).toContain('const pattern = /[{}]/;');
    expect(updated).toContain('import { nosamPlugin } from "nosam";');
    expect(patchViteConfigWithNosamPlugin('vite.config.ts', updated)).toBe(updated);
  });

  it('reuses an aliased import of nosamPlugin', () => {
    const source = `import { nosamPlugin as nosamVite } from 'nosam';
export default { plugins: [] };
`;
    const updated = patchViteConfigWithNosamPlugin('vite.config.ts', source)!;
    expect(updated).toContain('plugins: [nosamVite()]');
    expect(updated.match(/from 'nosam'/g)).toHaveLength(1);
  });

  it('inserts an import after a multiline import declaration', () => {
    const source = `import {
  defineConfig,
} from 'vite';
export default defineConfig({});
`;
    const updated = patchViteConfigWithNosamPlugin('vite.config.ts', source)!;
    expect(updated).toContain('} from \'vite\';\nimport { nosamPlugin } from "nosam";\n');
    expect(updated).toContain('plugins: [nosamPlugin()]');
  });

  it('leaves dynamic plugin properties for manual setup', () => {
    const source = `export default { plugins: getPlugins() }`;
    expect(patchViteConfigWithNosamPlugin('vite.config.ts', source)).toBeUndefined();
  });
});
