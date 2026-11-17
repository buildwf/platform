import { deleteCookie } from 'hono/cookie';
import { defineHandler } from 'nosam';

export const loader = defineHandler((context) => {
  deleteCookie(context, 'nosam_token', { path: '/' });
  return context.redirect('/login');
});
