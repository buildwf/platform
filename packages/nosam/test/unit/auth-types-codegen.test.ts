import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
  generateAuthTypes,
  removeAuthTypesIfPresent,
  syncAuthTypesFile,
} from '../../src/codegen/auth-types.ts';

function withTempProject(setup: (root: string) => void): {
  root: string;
  outDir: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), 'nosam-auth-codegen-'));
  setup(root);
  const outDir = join(root, '.nosam');
  mkdirSync(outDir, { recursive: true });
  return {
    root,
    outDir,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe('syncAuthTypesFile', () => {
  it('writes auth.d.ts when a config path is provided and removes it when null', () => {
    const { root, outDir, cleanup } = withTempProject((r) => {
      writeFileSync(join(r, 'auth.ts'), 'export default {};\n');
    });
    try {
      expect(syncAuthTypesFile(join(root, 'auth.ts'), outDir)).toBe(true);
      expect(syncAuthTypesFile(join(root, 'auth.ts'), outDir)).toBe(false);
      expect(syncAuthTypesFile(null, outDir)).toBe(true);
      expect(removeAuthTypesIfPresent(outDir)).toBe(false);
    } finally {
      cleanup();
    }
  });
});

describe('generateAuthTypes', () => {
  it('emits a module that fills the nosam/auth NosamAuthTypes registry', () => {
    const { root, outDir, cleanup } = withTempProject((r) => {
      writeFileSync(join(r, 'auth.ts'), 'export default {};');
    });
    try {
      const { dts } = generateAuthTypes(join(root, 'auth.ts'), outDir);
      expect(dts).toContain('export {}');
      // better-auth is reached through nosam/auth: apps usually cannot resolve it themselves.
      expect(dts).toContain(
        'import type { InferAuthInstance, InferAuthSession } from "nosam/auth";',
      );
      expect(dts).not.toContain('from "better-auth"');
      expect(dts).toContain(
        'type _NosamAuthSession = InferAuthSession<typeof import("../auth.ts")["default"]>;',
      );
      expect(dts).toContain('declare module "nosam/auth"');
      expect(dts).toContain('interface NosamAuthTypes {');
      expect(dts).toContain('auth: InferAuthInstance<typeof import("../auth.ts")["default"]>;');
      expect(dts).toContain('user: _NosamAuthSession["user"];');
      expect(dts).toContain('session: _NosamAuthSession["session"];');
    } finally {
      cleanup();
    }
  });
});
