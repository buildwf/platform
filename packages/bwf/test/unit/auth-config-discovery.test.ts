import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toSlash } from 'pathslash';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { findBwfAuthConfig } from '../../src/auth/config.ts';

const roots: Array<string> = [];
function rootWithAuth(source: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nosam-auth-source-'));
  roots.push(root);
  writeFileSync(join(root, 'auth.ts'), source);
  return root;
}

describe('auth config discovery', () => {
  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('finds a real bwf/auth import', () => {
    const root = rootWithAuth(
      "import { betterAuth } from '@buildwf/bwf/auth';\nexport default betterAuth;",
    );
    expect(findBwfAuthConfig(root)).toBe(toSlash(join(root, 'auth.ts')));
  });

  it('ignores bwf/auth text in comments and strings', () => {
    const root = rootWithAuth(
      "// import { betterAuth } from '@buildwf/bwf/auth';\nconst example = 'from \\\"@buildwf/bwf/auth\\\"';",
    );
    expect(findBwfAuthConfig(root)).toBeNull();
  });
});
