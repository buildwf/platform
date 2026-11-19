import { defineHandler } from '@builtbyfriends/bwf';
import { db } from '@builtbyfriends/bwf/db';
import { users } from '@schema';

export const GET = defineHandler(async () => {
  const all = await db.select().from(users);
  return all;
});
