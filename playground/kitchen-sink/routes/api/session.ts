import { defineHandler } from '@buildwf/bwf';
import { getSession } from '@buildwf/bwf/auth';

export const GET = defineHandler(() => {
  const auth = getSession();
  return { user: auth?.user ?? null, session: auth?.session ?? null };
});
