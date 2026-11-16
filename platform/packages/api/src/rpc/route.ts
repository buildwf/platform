import { rpcHandler } from '@eeao/http';
import { Hono } from 'hono';
import type { ApiEnv } from '../env.ts';
import { rememberCaller } from './procedure.ts';
import { registry } from './registry.ts';

const rpc = rpcHandler(registry, {
  basePath: '/rpc',
  openapi: { title: 'Void platform', version: '1' },
});

/** Mount behind `authMiddleware`: the procedures read the caller it resolved. */
export const rpcRoutes = new Hono<ApiEnv>().all('/*', async (context) => {
  const request = context.req.raw;
  rememberCaller(request, { user: context.get('user'), db: context.get('db') });
  // Without an execution context (tests, local scripts) background work finishes before the reply.
  const inline: Array<Promise<unknown>> = [];
  const response = await rpc(request, context.env, {
    waitUntil: (work) => {
      try {
        context.executionCtx.waitUntil(work);
      } catch {
        inline.push(work);
      }
    },
  });
  await Promise.allSettled(inline);
  return response;
});
