import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';

const ENTRY = join(import.meta.dirname, '..', '..', 'src', 'index.ts');

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'create-bwf-entry-'));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('create-bwf entry', () => {
  it('prints the runtime message before any other module links', () => {
    // Decision: An old Node fails to link a module that imports a newer API (for example `styleText` from
    // node:util in the bundled prompts). The hook makes each module other than the entry and the
    // runtime check fail the same way, so the message has to come first.
    const preload = join(root, 'old-node.mjs');
    writeFileSync(
      preload,
      `import { registerHooks } from 'node:module';
Object.defineProperty(process, 'versions', { value: { ...process.versions, node: '18.20.8' } });
const allowed = [${JSON.stringify(pathToFileURL(ENTRY).href)}, ${JSON.stringify(
        pathToFileURL(join(ENTRY, '..', 'runtime-support.ts')).href,
      )}];
registerHooks({
  resolve(specifier, context, next) {
    const result = next(specifier, context);
    if (!allowed.includes(result.url)) {
      throw new SyntaxError('cannot link ' + result.url);
    }
    return result;
  },
});
`,
    );
    const result = spawnSync(
      process.execPath,
      ['--import', pathToFileURL(preload).href, ENTRY, 'my-app'],
      { cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH } },
    );

    expect(result.status).toBe(1);
    expect(result.stderr.split('\n')[0]).toBe(
      `create-bwf: Node.js 24.22+ or 26.12+ is required. Found Node.js v18.20.8 (${process.execPath}).`,
    );
    expect(readdirSync(root)).not.toContain('my-app');
  });

  it.skipIf(process.platform === 'win32')(
    'installs the scoped CLI package and runs its bwf bin',
    () => {
      // Decision: The unscoped `bwf` package on npm belongs to someone else, so the new project has to
      // depend on @builtbyfriends/bwf. Stub npm and npx to record what create-bwf asks them to do.
      const bin = join(root, 'bin');
      const log = join(root, 'calls.log');
      mkdirSync(bin, { recursive: true });
      for (const name of ['npm', 'npx']) {
        const stub = join(bin, name);
        writeFileSync(stub, `#!/bin/sh\necho "${name} $*" >> ${JSON.stringify(log)}\n`);
        chmodSync(stub, 0o755);
      }
      const result = spawnSync(process.execPath, [ENTRY, 'scoped-app'], {
        cwd: root,
        encoding: 'utf8',
        env: { PATH: `${bin}:${process.env.PATH}` },
      });

      expect(result.status, result.stderr).toBe(0);
      const pkg = JSON.parse(readFileSync(join(root, 'scoped-app', 'package.json'), 'utf8'));
      expect(Object.keys(pkg.devDependencies)).toEqual(['@builtbyfriends/bwf']);
      expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
        'npm install',
        'npx bwf init',
        'npm install',
      ]);
    },
  );
});
