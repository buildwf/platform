// Decision: Finds unused files, exports and dependencies: `pnpm knip`. Run it in turn with `vp lint` until
// both are empty, since each removal can leave something new unused for the other to find.
import { readFileSync } from 'node:fs';
import type { KnipConfig } from 'knip';

// Decision: The packages build with `vp pack`, whose entries are listed in each vite.config.ts. Read them
// from there, so a new entry needs no change here.
const packEntries = (dir: string) => {
  const source = readFileSync(new URL(`${dir}/vite.config.ts`, import.meta.url), 'utf8');
  const list = /entry:\s*\[([\s\S]*?)\]/.exec(source)?.[1] ?? '';
  return [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

const scripts = (text: string) =>
  [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

const tests = ['test/**/*.{test,typecheck}.ts'];
// Decision: bwf apps are built from these folders by convention (docs/reference/structure.md).
const bwfApp = [
  'routes/**/*.ts',
  'middleware/**/*.ts',
  'crons/**/*.ts',
  'queues/**/*.ts',
  'email/**/*.ts',
  'db/schema.ts',
  'env.ts',
  'bwf.config.ts',
  'index.html',
];

export default {
  // Decision: The `vp pack` builds point the package's `imports` at dist, which the CLI and plugins resolve at
  // run time.
  ignoreUnresolved: [/^#self\//],
  ignoreIssues: {
    'packages/bwf/package.json': ['subpaths'],
    // Decision: `signedIn` is a second public name for `session`, and the size limits are named after what each
    // one bounds.
    'packages/bwf/src/runtime/procedure.ts': ['duplicates'],
    'platform/packages/api/src/build-manager.ts': ['duplicates'],
    // Decision: Two byte-identical copies, which a unit test compares.
    'packages/create-bwf/src/runtime-support.ts': ['exports'],
    'packages/bwf/src/cli/runtime-support.ts': ['exports'],
    // Decision: The fate code generator builds client.generated.ts from what these modules export.
    'platform/packages/api/src/admin/fate/*.ts': ['exports', 'types'],
  },
  // Decision: System tools the CLI and scripts run when they're there (clipboard, Cloudflare Tunnel, Wrangler
  // from the scripts).
  ignoreBinaries: ['cloudflared', 'wl-paste', 'wl-copy', 'pbcopy', 'clip', 'wrangler'],
  // Decision: Only the <script> blocks of a .vue file, or of a VitePress page, import anything.
  compilers: { vue: scripts, md: scripts },
  ignoreFiles: ['**/*.md'],
  workspaces: {
    '.': {
      // Decision: test/terminal-demos borrows the docs package's Vue and Iconify (see its README).
      ignoreDependencies: ['vue', '@iconify/vue'],
      entry: [
        'test/**/*.{ts,mjs}',
        'scripts/**/*.{ts,mjs}',
        '.github/scripts/*.{ts,mjs}',
        '.agents/skills/*/scripts/*.{ts,mjs}',
        'bwf.config.ts',
      ],
    },
    // Decision: cf-build-output.test.ts requires packages it writes into a temporary folder.
    'packages/bwf': {
      entry: [...packEntries('packages/bwf'), ...tests, 'test/**/*.mjs'],
      ignoreDependencies: ['@example/framework', 'framework'],
    },
    // Decision: `vp pack` builds it with Vite.
    'packages/create-bwf': {
      entry: [...packEntries('packages/create-bwf'), ...tests],
      ignoreDependencies: ['vite'],
    },
    'packages/platform': { entry: [...packEntries('packages/platform'), ...tests] },
    'packages/*': { entry: ['src/index.ts', ...tests] },
    // Decision: The fixtures are copied into playground/kitchen-sink, which has valibot, before they run.
    platform: {
      entry: ['scripts/**/*.{ts,mjs}', 'scripts/fixtures/**/*.ts'],
      ignoreDependencies: ['valibot'],
    },
    'platform/packages/api': {
      entry: [
        'src/index.ts',
        'src/admin/react/client.ts',
        'src/sandbox-controller-runtime.ts',
        'container/*.{mjs,d.mts}',
        'scripts/*.{ts,mjs}',
        ...tests,
        'test/integration/global-setup.ts',
      ],
      // Decision: scripts/build-sandbox-controller.mjs bundles bwf's sandbox container, which imports it.
      ignoreDependencies: ['@cloudflare/sandbox'],
    },
    // Decision: Its source imports proxy's files by relative path, so it lists proxy to get proxy's
    // dependencies installed.
    'platform/packages/email-gateway': {
      entry: tests,
      ignoreDependencies: ['@platform-service/proxy'],
    },
    'platform/packages/*': { entry: tests },
    // Decision: A bwf app. Its vite.config.ts reads .bwf/tsconfig.json, which only exists after a build.
    'platform/packages/dashboard': {
      entry: [
        'routes/**/*.ts',
        'middleware/**/*.ts',
        'server/**/*.ts',
        'bwf.config.ts',
        'index.html',
        'src/**/*.{ts,tsx}',
        'scripts/*.{ts,mjs}',
        ...tests,
      ],
      vite: false,
      vitest: false,
      ignoreDependencies: ['wrangler'],
    },
    // Decision: Sample bwf apps, with the same .bwf/tsconfig.json as above.
    // `@schema` is bwf's alias for db/schema.ts.
    'playground/*': {
      entry: [...bwfApp, 'src/**/*.{ts,tsx,vue}'],
      vite: false,
      vitest: false,
      ignoreDependencies: ['@schema'],
    },
    // Decision: `@assets` and `@components` come from the VoidZero theme's aliases. Wrangler deploys the built
    // site.
    docs: {
      entry: ['**/*.md', 'bwf.deploy.config.ts'],
      ignoreDependencies: [/^@assets\//, /^@components\//, 'wrangler'],
    },
  },
} satisfies KnipConfig;
