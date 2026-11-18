import { defineMiddleware } from '@buildwf/bwf';

export default defineMiddleware(async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.path}`);
  await next();
});
