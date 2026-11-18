import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { migrateLegacyBwfConfig, runMigrateCommand } from '../../src/cli/migrate.ts';
import { readConfig } from '../../src/config.ts';

const root = join(import.meta.dirname, '.tmp-migrate-test');

function setup(config: string): void {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'bwf.json'), config);
}

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('bwf migrate build output ignores', () => {
  function typedProject(): void {
    setup('{}');
    rmSync(join(root, 'bwf.json'));
    writeFileSync(join(root, 'bwf.config.ts'), 'export default {};\n');
  }

  it('adds the ignore to an already migrated project and leaves it unchanged on reruns', async () => {
    typedProject();
    await runMigrateCommand(root);
    const path = join(root, '.gitignore');
    expect(readFileSync(path, 'utf8')).toBe('.cloudflare\n');
    const before = statSync(path);
    await runMigrateCommand(root);
    expect(readFileSync(path, 'utf8')).toBe('.cloudflare\n');
    expect(statSync(path).mtimeMs).toBe(before.mtimeMs);
  });

  it.each(['\n', '\r\n'] as const)(
    'preserves existing rules and %j line endings, including an unterminated last line',
    async (newline) => {
      typedProject();
      const path = join(root, '.gitignore');
      const original = `# Project rules${newline}node_modules/${newline}!important.log`;
      writeFileSync(path, original);
      await runMigrateCommand(root);
      expect(readFileSync(path, 'utf8')).toBe(`${original}${newline}.cloudflare${newline}`);
    },
  );

  it.each(['.cloudflare', '/.cloudflare', '.cloudflare/', '/.cloudflare/'])(
    'does not rewrite an existing %s entry',
    async (entry) => {
      typedProject();
      const path = join(root, '.gitignore');
      const original = `# Keep these rules\r\n${entry}\r\n`;
      writeFileSync(path, original);
      await runMigrateCommand(root);
      expect(readFileSync(path, 'utf8')).toBe(original);
    },
  );

  it('adds the ignore after migrating legacy settings', async () => {
    setup('{}');
    await runMigrateCommand(root);
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe(
      '.bwf-wrangler.jsonc\n.cloudflare\n',
    );
  });

  it('preserves CRLF rules while migrating legacy settings', async () => {
    setup('{}');
    const path = join(root, '.gitignore');
    writeFileSync(path, '# Keep me\r\nnode_modules');
    await runMigrateCommand(root);
    expect(readFileSync(path, 'utf8')).toBe(
      '# Keep me\r\nnode_modules\r\n.bwf-wrangler.jsonc\r\n.cloudflare\r\n',
    );
  });

  it.each(['# .cloudflare', '!.cloudflare', '.cloudflare-other'])(
    'keeps %s while adding the output ignore',
    async (rule) => {
      typedProject();
      const path = join(root, '.gitignore');
      writeFileSync(path, `${rule}\n`);
      await runMigrateCommand(root);
      expect(readFileSync(path, 'utf8')).toBe(`${rule}\n.cloudflare\n`);
    },
  );

  it('leaves ignore rules untouched if configuration migration fails', async () => {
    setup('{broken');
    const path = join(root, '.gitignore');
    writeFileSync(path, '# Keep me\n');
    await expect(runMigrateCommand(root)).rejects.toThrow('Invalid JSON');
    expect(readFileSync(path, 'utf8')).toBe('# Keep me\n');
  });
});

describe('migrateLegacyBwfConfig', () => {
  it('preserves config values and keeps the original bytes in a backup', () => {
    const original =
      '{\n  "$schema": "./node_modules/@buildwf/bwf/schema.json",\n  "routing": { "typedRoutes": true },\n  "worker": { "compatibility_date": "2026-02-24" }\n}\n';
    setup(original);

    expect(migrateLegacyBwfConfig(root)).toBe(true);
    expect(existsSync(join(root, 'bwf.json'))).toBe(false);
    expect(readConfig(root)).toEqual({
      routing: { typedRoutes: true },
      worker: { compatibility_date: '2026-02-24' },
    });
    expect(readFileSync(join(root, '.bwf/config-migration/bwf.json'), 'utf8')).toBe(original);
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe('.bwf-wrangler.jsonc\n');
    expect(migrateLegacyBwfConfig(root)).toBe(false);
  });

  it('recovers the fallback bwf.json emitted by an older installed plugin after migration', () => {
    setup('{"sourceDir":"blog","worker":{"compatibility_date":"2025-12-17"}}');
    migrateLegacyBwfConfig(root);
    writeFileSync(join(root, 'bwf.json'), '{"worker":{"compatibility_date":"2026-02-24"}}\n');

    expect(migrateLegacyBwfConfig(root)).toBe(true);
    expect(existsSync(join(root, 'bwf.json'))).toBe(false);
    expect(readConfig(root).sourceDir).toBe('blog');
  });

  it('preserves a conflicting legacy config rather than treating it as generated', () => {
    setup('{"sourceDir":"blog"}');
    migrateLegacyBwfConfig(root);
    writeFileSync(
      join(root, 'bwf.json'),
      '{"sourceDir":"changed","worker":{"compatibility_date":"2026-02-24"}}\n',
    );

    expect(() => migrateLegacyBwfConfig(root)).toThrow('differ');
    expect(existsSync(join(root, 'bwf.json'))).toBe(true);
  });

  it('leaves invalid JSON and an existing typed config untouched', () => {
    setup('{broken');
    expect(() => migrateLegacyBwfConfig(root)).toThrow('Invalid JSON');
    expect(readFileSync(join(root, 'bwf.json'), 'utf8')).toBe('{broken');

    setup('{"sourceDir":"app"}');
    writeFileSync(join(root, 'bwf.config.ts'), 'export default { sourceDir: "other" };\n');
    expect(() => migrateLegacyBwfConfig(root)).toThrow('bwf.config.ts already exists');
    expect(existsSync(join(root, 'bwf.json'))).toBe(true);
  });

  it('finishes an interrupted migration if the typed config matches', () => {
    setup('{"sourceDir":"app"}');
    migrateLegacyBwfConfig(root);
    writeFileSync(join(root, 'bwf.json'), '{"sourceDir":"app"}');

    expect(migrateLegacyBwfConfig(root)).toBe(true);
    expect(existsSync(join(root, 'bwf.json'))).toBe(false);
    expect(readConfig(root).sourceDir).toBe('app');
  });

  it('moves complete Wrangler JSONC settings into typed config and a checked-in lock', () => {
    setup('{"routing":{"typedRoutes":false}}');
    const original =
      '// keep this provenance\n{ "name": "existing", "account_id": "123", "vars": { "CUSTOM": "yes" }, "d1_databases": [{ "binding": "DB", "database_name": "app", "database_id": "abc" }], "routes": [{ "pattern": "example.com/*", "zone_name": "example.com" }], "future_field": { "custom": true }, }\n';
    writeFileSync(join(root, 'wrangler.jsonc'), original);

    expect(migrateLegacyBwfConfig(root)).toBe(true);
    expect(readConfig(root).cloudflare).toEqual({
      name: 'existing',
      account_id: '123',
      vars: { CUSTOM: 'yes' },
      d1_databases: [{ binding: 'DB', database_name: 'app', database_id: 'abc' }],
      routes: [{ pattern: 'example.com/*', zone_name: 'example.com' }],
      future_field: { custom: true },
    });
    expect(existsSync(join(root, 'wrangler.jsonc'))).toBe(false);
    expect(readFileSync(join(root, '.bwf/config-migration/wrangler.jsonc'), 'utf8')).toBe(original);
    expect(JSON.parse(readFileSync(join(root, 'bwf.lock.json'), 'utf8')).text).toBe(original);
  });

  it('migrates a Wrangler-only project and rejects duplicate JSONC keys', () => {
    setup('{}');
    rmSync(join(root, 'bwf.json'));
    writeFileSync(join(root, 'wrangler.json'), '{"name":"existing"}');
    expect(migrateLegacyBwfConfig(root)).toBe(true);
    expect(readConfig(root).cloudflare?.name).toBe('existing');

    setup('{}');
    writeFileSync(join(root, 'wrangler.jsonc'), '{"name":"one", "name":"two"}');
    expect(() => migrateLegacyBwfConfig(root)).toThrow('Duplicate key');
    expect(existsSync(join(root, 'bwf.json'))).toBe(true);
    expect(existsSync(join(root, 'wrangler.jsonc'))).toBe(true);
  });

  it('leaves an already typed project with dynamic adapter options alone', () => {
    setup('{}');
    rmSync(join(root, 'bwf.json'));
    const typed = 'export default { cloudflare: { name: "app" } };\n';
    const adapter =
      'import cloudflare from "@astrojs/cloudflare"; const options = { configPath: "./.bwf-wrangler.jsonc" }; export default { adapter: cloudflare(options) };\n';
    writeFileSync(join(root, 'bwf.config.ts'), typed);
    writeFileSync(join(root, 'astro.config.ts'), adapter);

    expect(migrateLegacyBwfConfig(root)).toBe(false);
    expect(readFileSync(join(root, 'bwf.config.ts'), 'utf8')).toBe(typed);
    expect(readFileSync(join(root, 'astro.config.ts'), 'utf8')).toBe(adapter);
  });

  it('removes an implicit deploy pointer left by a pre-migration build', () => {
    setup('{}');
    const pointerDir = join(root, '.wrangler', 'deploy');
    mkdirSync(pointerDir, { recursive: true });
    const pointer = '{"configPath":"../../dist/ssr/wrangler.json"}';
    writeFileSync(join(pointerDir, 'config.json'), pointer);

    expect(migrateLegacyBwfConfig(root)).toBe(true);
    expect(existsSync(join(pointerDir, 'config.json'))).toBe(false);
    expect(readFileSync(join(root, '.bwf', 'preview-deploy-config.json'), 'utf8')).toBe(pointer);

    writeFileSync(join(pointerDir, 'config.json'), pointer);
    expect(migrateLegacyBwfConfig(root)).toBe(false);
    expect(existsSync(join(pointerDir, 'config.json'))).toBe(false);
  });
});
