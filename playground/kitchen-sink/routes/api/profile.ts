import { defineHandler } from '@builtbyfriends/bwf';
import { requireAuth } from '@builtbyfriends/bwf/auth';

export const GET = defineHandler((c) => {
  const user = requireAuth(c);
  return { user };
});
