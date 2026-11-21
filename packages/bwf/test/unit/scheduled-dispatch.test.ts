import { rmSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vite-plus/test';
import { compileRouteTable } from '../../src/router/compile.ts';

const roots: Array<string> = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});
const jobs = [
  { name: 'first', filePath: 'first.mjs', crons: ['* * * * *', '* * * * *'] },
  { name: 'second', filePath: 'second.mjs', crons: ['* * * * *'] },
  { name: 'other', filePath: 'other.mjs', crons: ['0 1 * * *'] },
];
type JobEnv = { calls: Array<string>; fail: boolean };
type Scheduled = (controller: { cron: string }, env: JobEnv, ctx: object) => Promise<void>;
type LoadJob = (
  path: string,
) => Promise<{ default: (controller: unknown, env: JobEnv) => Promise<void> }>;

function compileNativeScheduled(jobsDir: string, load: LoadJob): Scheduled {
  const code = compileRouteTable(
    {
      routes: [],
      middleware: [],
      jobs,
      queues: [],
    },
    '/routes',
    '/middleware',
    jobsDir,
    '/queues',
    {
      runtimeEnvPath: '/env',
      projectRoot: '/project',
      homeDir: '/home',
      auth: null,
    },
  );
  const source = code.slice(
    code.indexOf('const job0Crons'),
    code.indexOf('const __scheduledHandler'),
  );
  return new Function(
    'load',
    source.replace('export async function', 'async function').replaceAll('import(', 'load(') +
      '\nreturn scheduled;',
  )(load);
}

it('executes every matching job once and waits for siblings after failure', async () => {
  const scheduled = compileNativeScheduled('/project/crons', async (path) => ({
    default: async (_controller: unknown, env: JobEnv) => {
      const name = path.split('/').pop()!.replace('.mjs', '');
      if (name === 'second') {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      env.calls.push(name);
      if (name === 'first' && env.fail) {
        throw new Error('first failed');
      }
    },
  }));
  const env: JobEnv = { calls: [], fail: false };
  await scheduled({ cron: '* * * * *' }, env, {});
  expect(env.calls.sort()).toEqual(['first', 'second']);
  env.calls = [];
  env.fail = true;
  await expect(scheduled({ cron: '* * * * *' }, env, {})).rejects.toThrow();
  expect(env.calls.sort()).toEqual(['first', 'second']);
  env.calls = [];
  await scheduled({ cron: '0 2 * * *' }, env, {});
  expect(env.calls).toEqual([]);
});

it.each([
  ['crons', '/project/crons'],
  ['src/crons', '/project/src/crons'],
])('logs each failed job under %s with its cron and original error', async (dir, jobsDir) => {
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  const failure = new TypeError('first failed');
  const scheduled = compileNativeScheduled(jobsDir, async (path) => ({
    default: async (_controller: unknown, env: JobEnv) => {
      if (!env.fail) {
        return;
      }
      if (path.endsWith('/first.mjs')) {
        await new Promise((resolve) => setTimeout(resolve, 2));
        throw failure;
      }
      if (path.endsWith('/second.mjs')) {
        throw 'second failed';
      }
    },
  }));
  const env: JobEnv = { calls: [], fail: false };
  await scheduled({ cron: '* * * * *' }, env, {});
  expect(errorLog).not.toHaveBeenCalled();

  env.fail = true;
  const rejection = await scheduled({ cron: '* * * * *' }, env, {}).catch(
    (error: unknown) => error,
  );
  expect(rejection).toBeInstanceOf(AggregateError);
  const { errors, message } = rejection as AggregateError;
  expect(message).toBe(`Scheduled jobs failed: ${dir}/first.mjs, ${dir}/second.mjs`);
  expect(errors).toHaveLength(2);
  expect(errors[0]).toBe(failure);
  expect(errors[1]).toBe('second failed');
  expect(errorLog.mock.calls).toHaveLength(2);
  expect(errorLog.mock.calls[0][0]).toBe(
    `[bwf] Scheduled job ${dir}/second.mjs failed for cron "* * * * *":`,
  );
  expect(errorLog.mock.calls[0][1]).toBe('second failed');
  expect(errorLog.mock.calls[1][0]).toBe(
    `[bwf] Scheduled job ${dir}/first.mjs failed for cron "* * * * *":`,
  );
  expect(errorLog.mock.calls[1][1]).toBe(failure);
});

it('names a job whose module fails to load and waits for the other jobs', async () => {
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  const failure = new SyntaxError('module failed to load');
  const scheduled = compileNativeScheduled('/project/crons', async (path) => {
    if (path.endsWith('/first.mjs')) {
      throw failure;
    }
    return {
      default: async (_controller: unknown, env: JobEnv) => {
        await new Promise((resolve) => setTimeout(resolve, 2));
        env.calls.push(path.split('/').pop()!.replace('.mjs', ''));
      },
    };
  });
  const env: JobEnv = { calls: [], fail: false };

  const rejection = await scheduled({ cron: '* * * * *' }, env, {}).catch(
    (error: unknown) => error,
  );
  expect(env.calls).toEqual(['second']);
  expect(rejection).toBeInstanceOf(AggregateError);
  const { errors, message } = rejection as AggregateError;
  expect(message).toBe('Scheduled jobs failed: crons/first.mjs');
  expect(errors).toHaveLength(1);
  expect(errors[0]).toBe(failure);
  expect(errorLog.mock.calls).toHaveLength(1);
  expect(errorLog.mock.calls[0][0]).toBe(
    '[bwf] Scheduled job crons/first.mjs failed for cron "* * * * *":',
  );
  expect(errorLog.mock.calls[0][1]).toBe(failure);
});
