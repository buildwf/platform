import { defineMiddleware } from '@builtbyfriends/bwf';

declare module '@builtbyfriends/bwf' {
  interface CloudContextVariables {
    shared: { appName: string };
  }
}

export default defineMiddleware(async (c, next) => {
  c.set('shared', { appName: 'Kitchen Sink' });
  await next();
});
