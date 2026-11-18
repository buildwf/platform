import { defineMiddleware } from '@buildwf/bwf';

declare module '@buildwf/bwf' {
  interface CloudContextVariables {
    shared: { appName: string };
  }
}

export default defineMiddleware(async (c, next) => {
  c.set('shared', { appName: 'Kitchen Sink' });
  await next();
});
