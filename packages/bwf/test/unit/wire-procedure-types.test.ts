import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vite-plus/test';
import {
  generateWireProcedureTypes,
  resolveWireProcedureTypes,
  writeWireProcedureTypes,
} from '../../src/codegen/wire-procedure-types.ts';
import { validateConfig } from '../../src/config.ts';
import { scanProceduresSync } from '../../src/procedures/scan.ts';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const src = join(packageRoot, 'src');
const scratch = mkdtempSync(join(packageRoot, 'node_modules', '.wire-types-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const paths = {
  '@builtbyfriends/bwf/procedure': [join(src, 'runtime/procedure.ts')],
  '@builtbyfriends/bwf/rpc': [join(src, 'runtime/rpc.ts')],
};
const compilerOptions = {
  target: 'es2022',
  module: 'esnext',
  moduleResolution: 'bundler',
  strict: true,
  noEmit: true,
  allowImportingTsExtensions: true,
  skipLibCheck: true,
  types: [],
  baseUrl: '.',
  paths,
};

function project(name: string, files: Record<string, string>): string {
  const root = join(scratch, name);
  for (const [file, source] of Object.entries({
    'tsconfig.json': JSON.stringify({ compilerOptions }),
    ...files,
  })) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), source);
  }
  return root;
}

const header = `import { z } from 'zod';
import { procedure } from '@builtbyfriends/bwf/procedure';
import type { Contact } from '../lib.ts';
const r = { reason: 'Not part of this test' };
`;
const decided = `.noAuthz(r).noAnalytics(r).noMcp(r).noCli(r).noAiTool(r)`;

const procedureFiles: Record<string, string> = {
  'lib.ts': `export interface Contact { id: string; email: string; nested: { a: number } }
export type Status = 'on' | 'off';
`,
  'procedures/contacts.ts': `${header}
import type { Status } from '../lib.ts';
export const get = procedure()
  .noAuth(r)
  .input(z.object({ id: z.string(), when: z.date().optional() }))
  .output(z.object({ contact: z.custom<Contact>(), status: z.custom<Status>(), tags: z.array(z.string()) }))
  .errors({ NOT_FOUND: { status: 404, message: 'No such contact' } })
  ${decided}
  .handler(({ input, fail }) => (input.id === 'x' ? fail('NOT_FOUND') : ({} as never)));
export const ping = procedure()
  .noAuth(r)
  .noInput()
  .output(z.object({ ok: z.boolean() }))
  .noErrors(r)
  ${decided}
  .handler(() => ({ ok: true }));
export const notAProcedure = 42;
`,
  'procedures/billing/index.ts': `${header}
export default procedure()
  .noAuth(r)
  .input(z.object({ rows: z.record(z.string(), z.number()), pair: z.tuple([z.string(), z.number()]) }))
  .output(z.union([z.literal('a'), z.literal(1), z.null()]))
  .noErrors(r)
  ${decided}
  .handler(() => null);
`,
  'procedures/_shared.ts': `export const helper = 1;\n`,
};

describe('generateWireProcedureTypes', () => {
  it('writes one WireProcedure per name and imports nothing but the rpc types', () => {
    const text = generateWireProcedureTypes([
      {
        name: 'contacts.get',
        input: '{ id: string }',
        output: '{ ok: boolean }',
        errors: '"NOT_FOUND"',
      },
    ]);
    expect(text).toContain('import type { WireProcedure } from "@builtbyfriends/bwf/rpc";');
    expect(text).toContain(
      '"contacts.get": WireProcedure<{ id: string }, { ok: boolean }, "NOT_FOUND">;',
    );
    expect(text.match(/^import /gm)).toHaveLength(1);
  });

  it('keeps ProcedureMap declared with no procedures', () => {
    expect(generateWireProcedureTypes([])).toContain('interface ProcedureMap {}');
  });
});

describe('procedureTypes config', () => {
  it('takes a path to a .d.ts file', () => {
    expect(validateConfig({ procedureTypes: '../web/src/procedures.d.ts' }).procedureTypes).toBe(
      '../web/src/procedures.d.ts',
    );
  });

  it.each([[''], ['procedures.ts'], [3]])('rejects %j', (value) => {
    expect(() => validateConfig({ procedureTypes: value })).toThrow(/procedureTypes/);
  });
});

describe('resolveWireProcedureTypes', () => {
  const root = project('app', procedureFiles);
  const proceduresDir = join(root, 'procedures');
  const files = scanProceduresSync(proceduresDir);

  it('resolves input, output and error types, inlining named types', async () => {
    const { entries, problems } = await resolveWireProcedureTypes({ root, proceduresDir, files });
    const byName = Object.fromEntries(entries.map((entry) => [entry.name, entry]));
    expect(problems).toEqual([]);
    expect(Object.keys(byName).sort()).toEqual(['billing', 'contacts.get', 'contacts.ping']);
    expect(byName['contacts.get']).toEqual({
      name: 'contacts.get',
      input: '{ id: string; when?: Date | undefined }',
      output:
        '{ contact: { id: string; email: string; nested: { a: number } }; status: "off" | "on"; tags: string[] }',
      errors: '"NOT_FOUND"',
    });
    expect(byName['contacts.ping']).toMatchObject({ input: 'void', errors: 'never' });
    expect(byName.billing).toMatchObject({
      input: '{ rows: { [key: string]: number }; pair: [string, number] }',
      output: '"a" | 1 | null',
    });
  });

  it('writes a file with no import of server code', async () => {
    const { path, changed } = await writeWireProcedureTypes({
      root,
      target: 'web/procedures.d.ts',
      proceduresDir,
      files,
    });
    expect(changed).toBe(true);
    const text = readFileSync(path, 'utf8');
    expect(text).not.toMatch(/procedures\/|import\(|\.\.\//);
    expect(text.match(/^import .*$/gm)).toEqual([
      'import type { WireProcedure } from "@builtbyfriends/bwf/rpc";',
    ]);
  });
});

describe('a web workspace without procedures/', () => {
  it('calls rpc with checked input, output and error codes, and sees no Worker-only module', async () => {
    const hub = project('hub', procedureFiles);
    const proceduresDir = join(hub, 'procedures');
    const { path } = await writeWireProcedureTypes({
      root: hub,
      target: 'web/procedures.d.ts',
      proceduresDir,
      files: scanProceduresSync(proceduresDir),
    });
    const web = project('web', {
      'consumer.ts': `import { rpc, RpcError, type RpcErrorCode } from '@builtbyfriends/bwf/rpc';
import type { ProcedureMap } from '@builtbyfriends/bwf/rpc';

export async function ok() {
  const found = await rpc.contacts.get({ id: 'a' });
  const email: string = found.contact.email;
  const status: 'on' | 'off' = found.status;
  const pong: boolean = (await rpc.contacts.ping()).ok;
  const row: number | undefined = (await rpc.billing({ rows: {}, pair: ['a', 1] }))?.valueOf() as number;
  try {
    await rpc.contacts.get({ id: 'b' });
  } catch (error) {
    if (error instanceof RpcError) {
      const code: RpcErrorCode<ProcedureMap['contacts.get']> = 'NOT_FOUND';
      return [email, status, pong, row, code];
    }
  }
}

export async function wrong() {
  // @ts-expect-error input is checked
  await rpc.contacts.get({ id: 1 });
  // @ts-expect-error output is checked
  const n: number = (await rpc.contacts.ping()).ok;
  // @ts-expect-error error codes are checked
  const code: RpcErrorCode<ProcedureMap['contacts.get']> = 'OTHER';
  // @ts-expect-error unknown procedure
  rpc.contacts.missing();
  return [n, code];
}
`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          ...compilerOptions,
          baseUrl: undefined,
          paths: Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, v])),
        },
        include: ['consumer.ts', path],
      }),
    });

    const ts = await import('typescript/unstable/sync');
    const api = new ts.API({ cwd: web });
    try {
      const config = join(web, 'tsconfig.json');
      const opened = api.updateSnapshot({ openProject: config }).getProject(config);
      const program = opened!.program;
      const messages = program
        .getSemanticDiagnostics()
        .map((diagnostic) => (diagnostic as { text?: string }).text ?? String(diagnostic));
      expect(messages).toEqual([]);
      const loaded = program.getSourceFileNames();
      expect(loaded.some((file) => /\/hub\/(procedures|lib)\b/.test(file))).toBe(false);
      expect(loaded.some((file) => /node_modules\/(zod|hono|@cloudflare)/.test(file))).toBe(false);
    } finally {
      api.close();
    }
  });
});

describe('bwf prepare with procedureTypes', () => {
  it('writes the types-only file next to the usual .bwf output', async () => {
    const root = project('prepared', {
      ...procedureFiles,
      'bwf.json': JSON.stringify({ procedureTypes: 'web/procedures.d.ts' }),
    });
    const { prepareProject } = await import('../../src/codegen/prepare.ts');
    const result = await prepareProject(root);
    expect(result.written).toContain('web/procedures.d.ts');
    expect(readFileSync(join(root, 'web/procedures.d.ts'), 'utf8')).toContain(
      '"contacts.ping": WireProcedure<void, { ok: boolean }, never>;',
    );
    expect(readFileSync(join(root, '.bwf/procedures.d.ts'), 'utf8')).toContain('typeof import(');
    expect((await prepareProject(root)).written).not.toContain('web/procedures.d.ts');
  });
});
