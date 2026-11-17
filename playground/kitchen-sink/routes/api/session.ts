import { defineHandler } from 'nosam';
import { getSession } from 'nosam/auth';

export const GET = defineHandler(() => {
  const auth = getSession();
  return { user: auth?.user ?? null, session: auth?.session ?? null };
});
