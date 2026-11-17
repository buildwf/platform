import { describe, expect, it } from 'vite-plus/test';
import {
  inferBindingsFromSource,
  mergeBindings,
  type InferredBindings,
} from '../../src/inference/walk.ts';

const NO_BINDINGS: InferredBindings = {
  needsD1: false,
  needsKV: false,
  needsR2: false,
  needsAuth: false,
  needsQueues: false,
  needsAI: false,
  needsSandbox: false,
  needsLive: false,
  needsEmail: false,
};

const MODULE_BINDINGS = [
  ['nosam/db', 'needsD1'],
  ['nosam/kv', 'needsKV'],
  ['nosam/storage', 'needsR2'],
  ['nosam/auth', 'needsAuth'],
  ['nosam/queues', 'needsQueues'],
  ['nosam/ai', 'needsAI'],
  ['nosam/sandbox', 'needsSandbox'],
  ['nosam/email', 'needsEmail'],
  ['nosam/live', 'needsLive'],
] as const;

describe('inferBindingsFromSource', () => {
  it.each([
    'import { auth as account } from "nosam/client";',
    'import { "auth" as account } from "nosam/client";',
    'import { \\u0061uth as account } from "nosam/client";',
    'import * as client from "nosam/client"; client.auth.signOut();',
    'import * as client from "nosam/client/react"; client["auth"].useSession();',
    'import * as client from "nosam/client"; client["\\x61uth"].signOut();',
    'import * as client from "nosam/client"; client["aut\\h"].signOut();',
    'import * as client from "nosam/client"; client["au\\\nth"].signOut();',
    'import * as client from "nosam/client"; const { auth: account } = client;',
    'import * as client from "nosam/client"; const alias = client; alias.auth.signOut();',
    'import * as client from "nosam/client"; namespace Local { export const client = {}; } client.auth.signOut();',
    'const { auth } = await import("nosam/client");',
    'const client = await import("nosam/client"); client.auth.signOut();',
    'const value = (await import("nosam/client"))["auth"];',
    'async function run() { const client = await import("nosam/client"); client["\\141uth"].signOut(); }',
    'export { auth as account } from "nosam/client";',
    'export { "\\x61uth" as account } from "nosam/client";',
    'export * from "nosam/client";',
    'export * as client from "nosam/client";',
  ])('infers auth from the imported runtime value: %s', (code) => {
    expect(inferBindingsFromSource(code, 'test.ts')).toEqual({ ...NO_BINDINGS, needsAuth: true });
  });

  it.each([
    'import { fetch as auth } from "nosam/client";',
    'import { fetch /* auth */ } from "nosam/client";',
    'import { type auth, fetch } from "nosam/client";',
    'import type * as client from "nosam/client"; type T = typeof client.auth;',
    'import * as client from "nosam/client"; client.fetch("/api");',
    'import * as client from "nosam/client"; const parts = text.split(/\\s+/); client.fetch("/api");',
    'import * as client from "nosam/client"; function local(client) { return client.auth; }',
    'import * as client from "nosam/client"; function local() { client.auth(); var client; }',
    'import * as client from "nosam/client"; class Local { constructor(private client: any) { client.auth(); } }',
    'import * as client from "nosam/client"; function local() { enum client { auth }; return client.auth; }',
    'import * as client from "nosam/client"; const { fetch: auth } = client;',
    'import * as client from "nosam/client"; client[key];',
    'import * as client from "nosam/client"; const a = b; const b = a; a.auth;',
    'const { fetch: auth } = await import("nosam/client");',
    'const client = await import("nosam/client"); function local(client) { return client.auth; }',
    'export { fetch as auth } from "nosam/client";',
    'export { type auth, fetch } from "nosam/client";',
    'export type * from "nosam/client";',
  ])('ignores aliases, type-only names and unrelated auth properties: %s', (code) => {
    expect(inferBindingsFromSource(code, 'test.ts')).toEqual(NO_BINDINGS);
  });

  it('resolves long namespace alias chains without overflowing the stack', () => {
    const aliases = Array.from(
      { length: 10_000 },
      (_, index) => `const alias${index + 1} = alias${index};`,
    ).join('\n');
    const code = `import * as client from 'nosam/client'; const alias0 = client;
      ${aliases}
      alias10000.auth.signOut();`;
    expect(inferBindingsFromSource(code, 'test.ts')).toEqual({ ...NO_BINDINGS, needsAuth: true });
  });

  it.each([
    'const { DB, KV: cache } = c.env;',
    'const { ["DB"]: db, [`KV`]: cache } = env;',
    'const { env: { DB, KV } } = c;',
    'export const handler = ({ env: { DB, KV } }) => [DB, KV];',
    'function handler({ env: { DB, KV } = fallback }) {}',
    'function handler({ DB, KV } = env) {}',
    'const { DB, KV } = c.env as Env;',
    '({ DB, KV } = c.env);',
    'const value = [c.env["DB"], env[`KV`]];',
    'const value = [c["env"].DB, c.env?.KV];',
    'const value = [c.env /* keep */ .DB, env // keep\n .KV];',
    'const value = [env.D\\u0042, e\\u006ev.KV];',
    'const value = [c["e\\x6ev"].DB, c["e\\x6ev"].KV];',
    'const value = [c.env["\\x44B"], c.env["\\x4bV"]];',
    'const value = [c.env["D\\B"], c.env["K\\V"]];',
    'const value = [c["\\145nv"]["\\104B"], c["\\145nv"]["\\113V"]];',
    'const value = [c["en\\\nv"]["D\\\nB"], c["en\\\nv"]["K\\\nV"]];',
  ])('infers resources across static env access forms: %s', (code) => {
    expect(inferBindingsFromSource(code, 'test.ts')).toEqual({
      ...NO_BINDINGS,
      needsD1: true,
      needsKV: true,
    });
  });

  it.each([
    'const { DB: env } = unrelated;',
    'const { helper = DB } = env;',
    'const { [DB]: helper } = env;',
    'const value = env[key];',
    'const value = c[env].DB;',
    'const { env: { helper: DB } } = context;',
    'const { env: { SEND_EMAIL } } = context;',
    'const { env: { nested: { DB } } } = context;',
  ])('does not guess dynamic keys or mistake bound names for resources: %s', (code) => {
    expect(inferBindingsFromSource(code, 'test.ts')).toEqual(NO_BINDINGS);
  });

  it('infers every supported resource from renamed destructured properties', () => {
    expect(
      inferBindingsFromSource(
        'const { STORAGE: bucket, AI: ai, SANDBOX: sandbox, QUEUE_EMAILS: queue } = env;',
        'test.ts',
      ),
    ).toEqual({
      ...NO_BINDINGS,
      needsR2: true,
      needsAI: true,
      needsSandbox: true,
      needsQueues: true,
    });
  });

  it.each([
    "const load = () => import('nosam/ai');",
    'const load = () => import(`nosam/ai`);',
    "const load = () => import('nosam/\\u0061i');",
    "const load = () => import(('nosam/ai'));",
  ])('detects literal dynamic imports in TSX: %s', (statement) => {
    expect(inferBindingsFromSource(`${statement}\nconst view = <div />;`, 'view.tsx').needsAI).toBe(
      true,
    );
  });

  it.each([
    "type T = import('nosam/ai').AI;",
    "import type {} from 'nosam/ai';",
    "import { /* keep */ type AI } from 'nosam/ai';",
    "export type * from 'nosam/ai';",
    "const load = () => import('nosam/' + feature);",
    'const load = () => import(`nosam/${feature}`);',
    '// import("nosam/ai")\nconst text = "nosam/ai";',
  ])('does not infer runtime bindings from %s', (code) => {
    expect(inferBindingsFromSource(code, 'test.ts').needsAI).toBe(false);
  });

  it.each([
    "import {} from 'nosam/ai';",
    "export {} from 'nosam/ai';",
    "export /* keep */ {} from 'nosam/ai';",
    "export { /* keep */ } from 'nosam/ai';",
  ])('retains side-effect module references: %s', (code) => {
    expect(inferBindingsFromSource(code, 'test.ts').needsAI).toBe(true);
  });

  it.each([
    ['c.env.DB', 'needsD1'],
    ['env.DB', 'needsD1'],
    ['c.env.KV', 'needsKV'],
    ['c.env.STORAGE', 'needsR2'],
    ['c.env.QUEUE_EMAILS', 'needsQueues'],
    ['c.env.AI', 'needsAI'],
    ['env.AI', 'needsAI'],
    ['c.env.SANDBOX', 'needsSandbox'],
  ] as const)('detects %s access', (expression, binding) => {
    const code = `export async function handler(c, env) {\n  return ${expression}.get('key');\n}`;
    expect(inferBindingsFromSource(code, 'test.ts')).toEqual({ ...NO_BINDINGS, [binding]: true });
  });

  it('detects multiple bindings in one file', () => {
    const code = `
      export default defineHandler(async (c) => {
        const user = c.env.DB.prepare('SELECT 1').first()
        await c.env.KV.set('key', 'val')
        return user
      })
    `;
    const result = inferBindingsFromSource(code, 'test.ts');
    expect(result.needsD1).toBe(true);
    expect(result.needsKV).toBe(true);
    expect(result.needsR2).toBe(false);
  });

  it('ignores unrelated member expressions', () => {
    const code = `
      const x = foo.bar.DB
      const y = something.env.other
    `;
    const result = inferBindingsFromSource(code, 'test.ts');
    expect(result.needsD1).toBe(false);
  });

  it('returns empty for files with no bindings', () => {
    const code = `
      export default defineHandler(() => {
        return { status: 'ok' }
      })
    `;
    expect(inferBindingsFromSource(code, 'test.ts')).toEqual(NO_BINDINGS);
  });

  it.each(MODULE_BINDINGS)('detects value imports from %s', (source, binding) => {
    const code = `import { feature } from '${source}';`;
    expect(inferBindingsFromSource(code, 'test.ts')).toEqual({ ...NO_BINDINGS, [binding]: true });
  });

  it('handles invalid code gracefully', () => {
    const result = inferBindingsFromSource('not { valid {{{ code', 'bad.ts');
    expect(result.needsD1).toBe(false);
    expect(result.needsKV).toBe(false);
    expect(result.needsR2).toBe(false);
    expect(result.needsAuth).toBe(false);
  });

  it("detects import { auth } from 'nosam/client'", () => {
    const code = `
      import { auth } from "nosam/client";
      await auth.signOut();
    `;
    const result = inferBindingsFromSource(code, 'test.ts');
    expect(result.needsAuth).toBe(true);
  });

  it("detects auth imports from 'nosam/client' alongside other client helpers", () => {
    const code = `
      import { auth, fetch } from "nosam/client";
      await auth.signIn.email({ email, password });
      await fetch("/api/hello");
    `;
    const result = inferBindingsFromSource(code, 'test.ts');
    expect(result.needsAuth).toBe(true);
  });

  it("detects auth imports from framework-specific 'nosam/client' subpaths", () => {
    const code = `
      import { auth } from "nosam/client/react";
      await auth.useSession();
    `;
    const result = inferBindingsFromSource(code, 'test.tsx');
    expect(result.needsAuth).toBe(true);
  });

  it("does not detect auth from 'nosam/client' when only fetch is imported", () => {
    const code = `
      import { fetch } from "nosam/client";
      const data = await fetch("/api/hello");
    `;
    const result = inferBindingsFromSource(code, 'test.ts');
    expect(result.needsAuth).toBe(false);
  });

  it("does not detect auth from framework-specific 'nosam/client' subpaths when only fetch is imported", () => {
    const code = `
      import { fetch } from "nosam/client/react";
      const data = await fetch("/api/hello");
    `;
    const result = inferBindingsFromSource(code, 'test.tsx');
    expect(result.needsAuth).toBe(false);
  });

  it.each(MODULE_BINDINGS)('ignores type-only imports from %s', (source, binding) => {
    const named = inferBindingsFromSource(`import type { Feature } from '${source}';`, 'types.ts');
    const inline = inferBindingsFromSource(`import { type Feature } from '${source}';`, 'types.ts');
    expect(named[binding]).toBe(false);
    expect(inline[binding]).toBe(false);
  });

  it('ignores type-only AI imports in TSX while retaining value imports', () => {
    const typeOnly = `
      import type { AI } from 'nosam/ai';
      export const View = () => <div>AI</div>;
    `;
    expect(inferBindingsFromSource(typeOnly, 'View.tsx').needsAI).toBe(false);

    const mixed = `
      import { type AI, ai } from 'nosam/ai';
      export const View = () => <div>{String(ai)}</div>;
    `;
    expect(inferBindingsFromSource(mixed, 'View.tsx').needsAI).toBe(true);
  });

  it('detects a runtime AI import after an unrelated type import in TSX', () => {
    const code = `
      import type { Props } from './types';
      import { ai } from 'nosam/ai';
      export const View = () => <div>{String(ai)}</div>;
    `;
    expect(inferBindingsFromSource(code, 'View.tsx').needsAI).toBe(true);
  });

  it('ignores type-only AI re-exports but keeps runtime re-exports', () => {
    expect(inferBindingsFromSource("export type { AI } from 'nosam/ai';", 'types.ts').needsAI).toBe(
      false,
    );
    expect(inferBindingsFromSource("export { type AI } from 'nosam/ai';", 'types.ts').needsAI).toBe(
      false,
    );
    expect(inferBindingsFromSource("export { ai } from 'nosam/ai';", 'index.ts').needsAI).toBe(true);
  });

  it('does not infer email from env.SEND_EMAIL access', () => {
    const code = `
      export const POST = defineHandler(async (c) => {
        return c.env.SEND_EMAIL.send(message);
      })
    `;
    const result = inferBindingsFromSource(code, 'test.ts');
    expect(result.needsEmail).toBe(false);
  });

  it('does not detect needsAI from unrelated identifiers', () => {
    const code = `
      const AI = someLibrary;
      export const GET = defineHandler(() => {
        return { status: 'ok' }
      })
    `;
    const result = inferBindingsFromSource(code, 'test.ts');
    expect(result.needsAI).toBe(false);
  });

  it("does not detect live infrastructure from 'nosam/live/client'", () => {
    const code = `
      import { connectLiveStream } from "nosam/live/client";
      connectLiveStream("/live");
    `;
    const result = inferBindingsFromSource(code, 'client.ts');
    expect(result.needsLive).toBe(false);
  });
});

describe('mergeBindings', () => {
  const flags = Object.keys(NO_BINDINGS) as Array<keyof InferredBindings>;

  it('merges multiple binding results (union)', () => {
    const merged = mergeBindings(flags.map((flag) => ({ ...NO_BINDINGS, [flag]: true })));
    expect(merged).toEqual(Object.fromEntries(flags.map((flag) => [flag, true])));
  });

  it.each(flags)('merges the %s flag alone', (flag) => {
    expect(mergeBindings([NO_BINDINGS, { ...NO_BINDINGS, [flag]: true }])).toEqual({
      ...NO_BINDINGS,
      [flag]: true,
    });
  });

  it('handles empty array', () => {
    expect(mergeBindings([])).toEqual(NO_BINDINGS);
  });
});
