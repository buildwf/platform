import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

type MockCloudflarePluginConfig = {
  config: (resolved: Record<string, unknown>) => Record<string, unknown>;
};

vi.mock('../../src/plugin-cloudflare.ts', () => import('../helpers/cloudflare-vite-plugin.ts'));

const roots: Array<string> = [];

function project(framework = false): string {
  const root = mkdtempSync(join(tmpdir(), 'nosam-pg-bindings-'));
  roots.push(root);
  writeFileSync(join(root, 'bwf.json'), JSON.stringify({ database: 'pg' }));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      devDependencies: framework ? { '@sveltejs/kit': '2.70.3' } : {},
    }),
  );
  const route = framework ? 'src/routes/+page.server.ts' : 'routes/api/users.ts';
  mkdirSync(join(root, framework ? 'src/routes' : 'routes/api'), { recursive: true });
  writeFileSync(
    join(root, route),
    "import { db } from '@builtbyfriends/bwf/db'; export const GET = () => db;",
  );
  return root;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('PostgreSQL binding generation', () => {
  it.each([false, true])(
    'generates custom binding types at startup (framework: %s)',
    async (framework) => {
      const root = project(framework);
      writeFileSync(
        join(root, 'bwf.json'),
        JSON.stringify({ cloudflare: { ratelimits: [{ name: 'CUSTOM_LIMITER' }] } }),
      );
      vi.spyOn(process, 'cwd').mockReturnValue(root);
      const { bwfPlugin } = await import('../../src/index.ts');
      bwfPlugin();
      expect(readFileSync(join(root, '.bwf/bindings.d.ts'), 'utf8')).toContain(
        '"CUSTOM_LIMITER": RateLimit;',
      );
      expect(JSON.parse(readFileSync(join(root, '.bwf/tsconfig.json'), 'utf8')).files).toContain(
        'bindings.d.ts',
      );
    },
  );

  it('does not emit a D1 placeholder for a bwf app using bwf/db', async () => {
    const root = project();
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    const { bwfPlugin } = await import('../../src/index.ts');
    const cloudflarePlugin = bwfPlugin().find((plugin) => plugin.name === 'mock:cloudflare');
    if (!cloudflarePlugin) {
      throw new Error('Expected Cloudflare plugin.');
    }
    const config = (cloudflarePlugin.api as { pluginConfig: MockCloudflarePluginConfig })
      .pluginConfig.config;

    const patch = config({});
    expect(patch.d1_databases).toBeUndefined();
  });
});
