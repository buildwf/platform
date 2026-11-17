import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getWorkerBundleDir } from '@cloudflare/build-output-utils';
import { createServer, resolveConfig } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { nosamPlugin } from '../../src/index.ts';
import { getHookHandler } from '../helpers/vite-hooks.ts';

const roots: Array<string> = [];

function createProjectRoot(): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'nosam-vite-env-')));
  roots.push(root);
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      dependencies: {},
    }),
  );
  writeFileSync(
    join(root, 'nosam.json'),
    JSON.stringify({ worker: { compatibility_date: '2026-02-24' } }),
  );
  return root;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const root of roots.splice(0, roots.length)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('nosamPlugin Vite environments', () => {
  it('does not create nosam.json during Vite config resolution', async () => {
    const root = createProjectRoot();
    rmSync(join(root, 'nosam.json'), { force: true });
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    await resolveConfig(
      {
        root,
        plugins: [nosamPlugin()],
      },
      'serve',
      'development',
    );

    expect(existsSync(join(root, 'nosam.json'))).toBe(false);
  });

  it('does not claim Vite SSR environments configured by test runners', async () => {
    const root = createProjectRoot();
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    await expect(
      resolveConfig(
        {
          root,
          plugins: [nosamPlugin()],
          environments: {
            ssr: {
              resolve: {
                external: ['node:fs'],
              },
            },
          },
        },
        'serve',
        'test',
      ),
    ).resolves.toMatchObject({
      environments: {
        nosam_worker: {
          build: {
            outDir: getWorkerBundleDir(realpathSync.native(root)),
          },
        },
      },
    });
  });

  it('clears resolve.external from the worker environment configured by test runners', async () => {
    const root = createProjectRoot();
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    const config = await resolveConfig(
      {
        root,
        plugins: [nosamPlugin()],
        environments: {
          nosam_worker: {
            resolve: {
              external: ['node:fs'],
              conditions: ['workerd'],
            },
            build: {
              emptyOutDir: false,
            },
          },
        },
      },
      'serve',
      'test',
    );

    expect(config.environments.nosam_worker.resolve.external).toEqual([]);
    expect(config.environments.nosam_worker.resolve.conditions).toContain('workerd');
    expect(config.environments.nosam_worker.build).toMatchObject({
      emptyOutDir: false,
      outDir: getWorkerBundleDir(realpathSync.native(root)),
    });
  });

  it('prebundles void CommonJS dependencies only in the worker environment', async () => {
    const root = createProjectRoot();
    writeFileSync(
      join(root, 'nosam.json'),
      JSON.stringify({ database: 'pg', worker: { compatibility_date: '2026-02-24' } }),
    );
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    const config = await resolveConfig({ root, plugins: [nosamPlugin()] }, 'serve', 'development');

    expect(config.environments.nosam_worker.optimizeDeps.include).toEqual(
      expect.arrayContaining(['nosam > email-validator', 'nosam > pg']),
    );
    expect(config.environments.nosam_worker.optimizeDeps.exclude).toEqual(
      expect.arrayContaining(['nosam', 'better-auth']),
    );
    expect(config.environments.ssr.optimizeDeps.include).toEqual([]);
    expect(config.environments.ssr.optimizeDeps.exclude ?? []).not.toContain('better-auth');
  });

  /** An installed package with the given manifest and `index.js`. */
  it('loads a table file outside db/ that imports sql from nosam/db after a route loads nosam/db', async () => {
    // #472: db/schema.ts re-exports a table file outside db/, which imports nosam/db while
    // nosam/db is still loading db/schema.ts.
    const root = realpathSync.native(createProjectRoot());
    mkdirSync(join(root, 'db'));
    writeFileSync(
      join(root, 'db/schema.ts'),
      'export * from "../src/resources/projects/projects.schema";\n',
    );
    mkdirSync(join(root, 'src/resources/projects'), { recursive: true });
    // A top-level sql`` call, as in a column default, is enough to need the helper.
    writeFileSync(
      join(root, 'src/resources/projects/projects.schema.ts'),
      "import { sql } from 'nosam/db';\nexport const projects = sql`(datetime('now'))`;\n",
    );
    mkdirSync(join(root, 'routes/api'), { recursive: true });
    writeFileSync(
      join(root, 'routes/api/projects.ts'),
      [
        "import { db } from 'nosam/db';",
        "import { projects } from '@schema';",
        'export const GET = () => Response.json({ db: typeof db, projects: typeof projects });',
        '',
      ].join('\n'),
    );
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [nosamPlugin()],
      optimizeDeps: { noDiscovery: true },
      // No watcher: macOS can report the files just written as changed, which
      // reloads nosam/db while the route is still loading it.
      server: { middlewareMode: true, ws: false, watch: null, preTransformRequests: false },
    });
    try {
      const route = await server.ssrLoadModule('/routes/api/projects.ts');
      const response = (route.GET as () => Response)();

      await expect(response.json()).resolves.toEqual({ db: 'object', projects: 'object' });
    } finally {
      await server.close();
    }
  }, 30_000);

  it('passes database.casing to the nosam/db client of a Nosam app', async () => {
    const root = createProjectRoot();
    writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
    writeFileSync(
      join(root, 'nosam.json'),
      JSON.stringify({
        database: { dialect: 'pg', casing: 'snake_case' },
        worker: { compatibility_date: '2026-02-24' },
      }),
    );
    mkdirSync(join(root, 'db'));
    writeFileSync(join(root, 'db/schema.ts'), 'export {};\n');
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    const config = await resolveConfig({ root, plugins: [nosamPlugin()] }, 'serve', 'development');
    const plugin = config.plugins.find((candidate) => candidate.name === 'nosam:drizzle');
    const load = getHookHandler(plugin?.load) as (this: object, id: string) => string;

    expect(load.call({}, '\0virtual:nosam-db')).toContain(
      'drizzle(connectionString, { schema, casing: "snake_case" })',
    );
  });
});

describe('deploy-build preview', () => {
  it('preserves the fresh deploy pointer when vite previews inside a deploy build', () => {
    const root = createProjectRoot();
    rmSync(join(root, 'nosam.json'));
    writeFileSync(join(root, 'nosam.config.ts'), 'export default {};\n');
    const stash = '{"configPath":"../../old-build/wrangler.json"}';
    const fresh = '{"configPath":"../../dist/server/wrangler.json"}';
    mkdirSync(join(root, '.nosam'), { recursive: true });
    writeFileSync(join(root, '.nosam/preview-deploy-config.json'), stash);
    const pointer = join(root, '.wrangler/deploy/config.json');
    mkdirSync(join(root, '.wrangler/deploy'), { recursive: true });
    writeFileSync(pointer, fresh);
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    vi.stubEnv('NOSAM_CLOUDFLARE_DEPLOY_BUILD', '1');
    const once = vi.spyOn(process, 'once').mockReturnValue(process);
    const argv = process.argv;
    process.argv = [argv[0]!, 'vite', 'build'];
    try {
      const guard = nosamPlugin().find(
        (plugin) => plugin.name === 'nosam:remove-implicit-cloudflare-deploy-pointer',
      )!;
      const configure = getHookHandler(guard.config) as (
        config: object,
        env: { command: string; mode: string; isPreview: boolean },
      ) => void;
      configure({}, { command: 'serve', mode: 'production', isPreview: true });
      for (const [event, listener] of once.mock.calls) {
        if (event === 'exit') {
          (listener as () => void)();
        }
      }
      expect(existsSync(pointer)).toBe(true);
      expect(readFileSync(pointer, 'utf8')).toBe(fresh);
      expect(readFileSync(join(root, '.nosam/preview-deploy-config.json'), 'utf8')).toBe(stash);
    } finally {
      process.argv = argv;
    }
  });
});
