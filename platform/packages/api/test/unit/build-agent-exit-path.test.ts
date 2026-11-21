import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

// Decision: `finishBuildLogging` makes the container's exit-path order testable.
//
// The exit path mustn't await `flushLogs()` before the drain barrier. That push has no route to the
// DO's log sink: BuildManager registers no `outboundByHost`/`outbound` handler and the api worker
// exports no `ContainerProxy`, so `@cloudflare/containers` doesn't intercept outbound traffic, and
// the POST goes to the public internet, where the single-label `DO_LOG_URL` host doesn't resolve.
// It would deliver nothing while using up the DO's LOG_DRAIN_GRACE_SECONDS window (up to
// 2 x DO_POST_TIMEOUT_MS). A grace miss inside the barrier makes `enforceTimeout` overwrite a
// successful live deploy with 'build timed out'.
//
// DO_LOG_URL is read into a const at module load (and deleted from process.env), and postToDo
// no-ops on an empty URL, so set it before importing the agent module. Per-file module isolation
// keeps this instance apart from other suites'.
describe('build-agent exit path (finishBuildLogging)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DO_LOG_URL;
  });

  it('does not spend the drain grace on a push that has no route to the DO', async () => {
    process.env.DO_LOG_URL = 'http://test-do/logs';

    // Decision: Each POST hangs, like a black-holed DO. If the exit path flushes, it can't return.
    const seen: Array<string> = [];
    vi.stubGlobal('fetch', (url: unknown) => {
      seen.push(String(url));
      return new Promise(() => {});
    });

    const { record, finishBuildLogging } = await import('../../container/build-agent.mjs');

    record('[build-agent] bwf deploy exited with code 0', 'stdout');

    const startedAt = Date.now();
    await finishBuildLogging(null, { timeoutMs: 50, pollMs: 5 });

    expect(seen).toEqual([]);
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });

  it('runs the drain barrier BEFORE closing the control server', async () => {
    // Decision: Check the order, not only presence. Closing the server first would tear down the only transport
    // the DO's pull loop can reach, which is the tail loss the barrier exists to prevent.
    const order: Array<string> = [];
    const { finishBuildLogging } = await import('../../container/build-agent.mjs');

    const server = {
      close(cb: () => void) {
        order.push('close');
        cb();
      },
    };

    await finishBuildLogging(server, {
      timeoutMs: 50,
      pollMs: 5,
      served: () => {
        order.push('drain');
        return 0;
      },
      recorded: () => 0,
    });

    expect(order).toEqual(['drain', 'close']);
  });
});
