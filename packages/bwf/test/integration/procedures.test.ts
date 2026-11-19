import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { afterAll, describe, expect, it } from 'vite-plus/test';
import { scanProceduresSync } from '../../src/procedures/scan.ts';
import { compileRouteTable, compileWorkerEntry } from '../../src/router/compile.ts';
import type { ScanResult } from '../../src/router/scan.ts';

const temporary = mkdtempSync(join(tmpdir(), 'nosam-procedures-'));
const procedureModule = fileURLToPath(new URL('../../src/runtime/procedure.ts', import.meta.url));
const proceduresRuntime = fileURLToPath(
  new URL('../../src/runtime/procedures.ts', import.meta.url),
);

type Worker = {
  fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response>;
};

const header = `import { z } from 'zod';
import { procedure, session } from '@builtbyfriends/bwf/procedure';
const r = { reason: 'Not part of this test' };
`;

// Every decision made, so only the name and auth differ between procedures.
const decided = `.noAuthz(r).noErrors(r).noAnalytics(r).noMcp(r).noCli(r).noAiTool(r)`;

const files: Record<string, string> = {
  'contacts.ts': `${header}
export const get = procedure()
  .noAuth(r)
  .input(z.object({ id: z.string() }))
  .output(z.object({ id: z.string(), name: z.string() }))
  ${decided}
  .handler(({ input }) => ({ id: input.id, name: 'Ada' }));
export const mine = procedure()
  .auth(session)
  .noInput()
  .output(z.object({ id: z.string() }))
  ${decided}
  .handler(({ ctx }) => ({ id: ctx.id }));
export const notAProcedure = 42;
`,
  'billing/index.ts': `${header}
export default procedure().noAuth(r).noInput().output(z.object({ ok: z.boolean() }))${decided}
  .handler(() => ({ ok: true }));
`,
  'billing/invoices.ts': `${header}
export const list = procedure().noAuth(r).noInput().output(z.array(z.string()))${decided}
  .handler(() => ['inv_1']);
export const renamed = procedure('invoices.legacy').noAuth(r).noInput().output(z.string())${decided}
  .handler(() => 'old');
`,
  'tools.ts': `${header}
export const ping = procedure().noAuth(r).noInput().output(z.string())
  .noAuthz(r).noErrors(r).noAnalytics(r).mcp({ description: 'Ping', effect: 'read', idempotent: true }).noCli(r).noAiTool(r)
  .handler(() => 'pong');
`,
  '_shared.ts': `export const helper = 1;\n`,
};

async function buildWorker(name: string, sources: Record<string, string>): Promise<Worker> {
  const root = join(temporary, name);
  const proceduresDir = join(root, 'procedures');
  const middlewareDir = join(root, 'middleware');
  for (const [file, source] of Object.entries(sources)) {
    mkdirSync(join(proceduresDir, file, '..'), { recursive: true });
    writeFileSync(join(proceduresDir, file), source);
  }
  mkdirSync(middlewareDir, { recursive: true });
  writeFileSync(
    join(middlewareDir, '00.stamp.ts'),
    `export default async (c, next) => { await next(); c.res.headers.set('x-middleware', 'ran'); };\n`,
  );
  const runtimeEnvPath = join(root, 'runtime-env.ts');
  writeFileSync(runtimeEnvPath, 'export function withRuntimeEnv(_env, fn) { return fn(); }\n');

  const scan: ScanResult = {
    routes: [],
    middleware: [{ filePath: '00.stamp.ts', order: 0 }],
    jobs: [],
    queues: [],
    procedures: scanProceduresSync(proceduresDir),
  };
  const routeTablePath = join(root, 'virtual-nosam-routes.ts');
  writeFileSync(
    routeTablePath,
    compileRouteTable(scan, root, middlewareDir, root, root, {
      honoPath: import.meta.resolve('hono'),
      honoRoutePath: import.meta.resolve('hono/route'),
      runtimeEnvPath,
      projectRoot: root,
      homeDir: root,
      auth: null,
      procedures: {
        dir: proceduresDir,
        runtimePath: proceduresRuntime,
        name: 'procedures-test',
        version: '1.0.0',
      },
    }),
  );
  const workerPath = join(root, 'worker.ts');
  writeFileSync(workerPath, compileWorkerEntry({ runtimeEnvPath }));

  const outDir = join(root, 'dist');
  await build({
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: [
        { find: '@builtbyfriends/bwf/procedure', replacement: procedureModule },
        { find: /^zod$/, replacement: fileURLToPath(import.meta.resolve('zod')) },
      ],
    },
    plugins: [
      {
        name: 'nosam-procedures-test',
        resolveId(id) {
          if (id === 'cloudflare:workers') {
            return '\0test-workers-entrypoint';
          }
          return id === 'virtual:nosam-routes' ? routeTablePath : null;
        },
        load(id) {
          if (id === '\0test-workers-entrypoint') {
            return 'export class WorkerEntrypoint { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }';
          }
        },
      },
    ],
    ssr: { noExternal: true },
    build: {
      emptyOutDir: true,
      outDir,
      ssr: workerPath,
      target: 'esnext',
      rollupOptions: {
        external: (id) => id.startsWith('cloudflare:') && id !== 'cloudflare:workers',
        output: { entryFileNames: 'worker.mjs', codeSplitting: false },
      },
    },
  });
  const module = (await import(pathToFileURL(join(outDir, 'worker.mjs')).href)) as {
    default: new (ctx: ExecutionContext, env: Record<string, unknown>) => Worker;
  };
  const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
  return new module.default(ctx, {});
}

afterAll(() => rmSync(temporary, { recursive: true, force: true }));

describe('procedures/', () => {
  const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
  const call = async (worker: Worker, name: string, body?: unknown) => {
    const res = await worker.fetch(
      new Request(`https://app.test/rpc/${name}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? '' : JSON.stringify(body),
      }),
      {},
      ctx,
    );
    return {
      status: res.status,
      headers: res.headers,
      body: (await res.json()) as Record<string, unknown>,
    };
  };

  it('names procedures from the file path and export, and serves them at /rpc', async () => {
    const worker = await buildWorker('ok', files);
    expect(await call(worker, 'contacts.get', { id: 'c1' })).toMatchObject({
      status: 200,
      body: { data: { id: 'c1', name: 'Ada' } },
    });
    expect((await call(worker, 'billing')).body).toEqual({ data: { ok: true } });
    expect((await call(worker, 'billing.invoices.list')).body).toEqual({ data: ['inv_1'] });
    // An explicit name wins over the path.
    expect((await call(worker, 'invoices.legacy')).body).toEqual({ data: 'old' });
    expect((await call(worker, 'billing.invoices.renamed')).status).toBe(404);
  });

  it('serves procedures that chose MCP as tools at /mcp', async () => {
    const worker = await buildWorker('mcp', files);
    const res = await worker.fetch(
      new Request('https://app.test/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          host: 'app.test',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      }),
      {},
      ctx,
    );
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('tools_ping');
    expect(text).not.toContain('contacts_get');
  });

  it('runs app middleware around procedure calls', async () => {
    const worker = await buildWorker('middleware', files);
    const res = await call(worker, 'contacts.get', { id: 'c1' });
    expect(res.headers.get('x-middleware')).toBe('ran');
  });

  it('checks input and answers 401 for session procedures without a signed-in user', async () => {
    const worker = await buildWorker('checks', files);
    expect((await call(worker, 'contacts.get', {})).status).toBe(400);
    expect((await call(worker, 'contacts.mine')).status).toBe(401);
  });

  it('stops the Worker from loading when a procedure is unfinished', async () => {
    await expect(
      buildWorker('broken', {
        'drafts.ts': `${header}
export const save = procedure().noAuth(r).noInput().output(z.string());
`,
      }),
    ).rejects.toThrow(/"drafts\.save": not finished/);
  });
});
