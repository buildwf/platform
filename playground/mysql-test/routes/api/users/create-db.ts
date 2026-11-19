import { defineHandler } from '@builtbyfriends/bwf';
import { createDb } from '@builtbyfriends/bwf/db';
import { users } from '@schema';

export const GET = defineHandler(async (c) => {
  const all = await createDb(String(c.env.DATABASE_URL)).select().from(users);
  return all;
});
