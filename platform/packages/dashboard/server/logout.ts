import { defineHandler } from '@builtbyfriends/bwf';
import { deleteCookie } from 'hono/cookie';

export const loader = defineHandler((context) => {
  deleteCookie(context, 'nosam_token', { path: '/' });
  return context.redirect('/login');
});
