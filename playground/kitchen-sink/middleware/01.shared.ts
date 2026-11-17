import { defineMiddleware } from 'nosam';

declare module 'nosam' {
  interface CloudContextVariables {
    shared: { appName: string };
  }
}

export default defineMiddleware(async (c, next) => {
  c.set('shared', { appName: 'Kitchen Sink' });
  await next();
});
