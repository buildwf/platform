import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

// eeao is a separate project (the `eeaao` submodule). Void talks to it only through the
// procedures adapter: runtime/procedure.ts, runtime/procedures.ts and the client runtime/rpc.ts. Nothing else in the
// framework imports an @eeao package, so the framework stays usable and testable without it.
const src = join(import.meta.dirname, '..', '..', 'src');
const adapter = new Set(['runtime/procedure.ts', 'runtime/procedures.ts', 'runtime/rpc.ts']);

function files(dir: string): Array<string> {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('eeao boundary', () => {
  it('only the procedures adapter imports @eeao packages', () => {
    const offenders = files(src)
      .map((f) => relative(src, f))
      .filter((f) => !adapter.has(f))
      .filter((f) => /['"]@eeao\//.test(readFileSync(join(src, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
