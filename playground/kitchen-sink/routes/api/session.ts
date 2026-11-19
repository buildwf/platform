import { defineHandler } from '@builtbyfriends/bwf';
import { getSession } from '@builtbyfriends/bwf/auth';

export const GET = defineHandler(() => {
  const auth = getSession();
  return { user: auth?.user ?? null, session: auth?.session ?? null };
});
