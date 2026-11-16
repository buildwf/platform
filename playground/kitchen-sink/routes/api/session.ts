import { defineHandler } from 'void';
import { getSession } from 'void/auth';

export const GET = defineHandler(() => {
  const auth = getSession();
  return { user: auth?.user ?? null, session: auth?.session ?? null };
});
