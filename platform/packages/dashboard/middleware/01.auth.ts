import { defineMiddleware } from '@builtbyfriends/bwf';
import { deleteCookie, getCookie } from 'hono/cookie';
import { getCurrentUser, type CurrentUser } from '../lib/api.ts';

export type DashboardUser = CurrentUser;

declare module '@builtbyfriends/bwf' {
  interface CloudContextVariables {
    token: string;
    dashboardUser: DashboardUser;
  }
}

const PUBLIC_PATHS = new Set(['/favicon.svg', '/login', '/logout', '/api/page/login']);
const PUBLIC_PREFIXES = ['/assets/', '/auth/'];

export function isPublicDashboardPath(path: string): boolean {
  return PUBLIC_PATHS.has(path) || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** Signed-in pages and the SPA's data endpoints; scripts, styles and other assets stay public. */
export function isProtectedDashboardPath(path: string): boolean {
  return path === '/' || path === '/account' || path.startsWith('/api/');
}

export default defineMiddleware(async (context, next) => {
  const path = context.req.path;

  if (isPublicDashboardPath(path) || !isProtectedDashboardPath(path)) {
    return next();
  }

  // The SPA's data requests get a status it can act on instead of a redirect to an HTML page.
  const signIn = () =>
    path.startsWith('/api/')
      ? context.json({ error: 'Sign in required' }, 401)
      : context.redirect('/login');
  const token = getCookie(context, 'platform_token');
  if (!token) {
    return signIn();
  }

  context.set('token', token);
  const user = await getCurrentUser(context);
  if (!user) {
    deleteCookie(context, 'platform_token', { path: '/' });
    return signIn();
  }

  context.set('dashboardUser', user);

  return next();
});
