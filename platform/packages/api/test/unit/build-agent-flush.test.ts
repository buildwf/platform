import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

// Decision: flushLogs runs on a fire-and-forget setInterval. A plain `await postToDo()` against a slow or hung
// DO would let each 500ms tick start another POST, each holding its batch and JSON body in an
// unresolved promise, so in-flight bodies grow without bound. flushLogs is single-flight:
// concurrent callers join the in-flight promise, so at most one POST is in flight.
//
// DO_LOG_URL is read into a const at module load (and deleted from process.env), and postToDo
// no-ops on an empty URL, so this file sets it before importing the agent module dynamically.
describe('build-agent flushLogs single-flight (in-flight POST bounding)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DO_LOG_URL;
  });

  it('joins the in-flight POST instead of starting a parallel one while it hangs', async () => {
    process.env.DO_LOG_URL = 'http://test-do/logs';

    const resolvers: Array<(value: unknown) => void> = [];
    vi.stubGlobal('fetch', () => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { record, flushLogs } = await import('../../container/build-agent.mjs');

    record('line-1', 'stdout');
    const p1 = flushLogs();
    record('line-2', 'stdout');
    const p2 = flushLogs();

    expect(resolvers.length).toBe(1);
    expect(p2).toBe(p1);

    vi.stubGlobal('fetch', () => Promise.resolve({ ok: true }));
    resolvers[0]({ ok: true });
    await p1;
  });
});
