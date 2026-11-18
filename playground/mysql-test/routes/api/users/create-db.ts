import { defineHandler } from '@buildwf/bwf';
import { createDb } from '@buildwf/bwf/db';
import { users } from '@schema';

export const GET = defineHandler(async (c) => {
  const all = await createDb(String(c.env.DATABASE_URL)).select().from(users);
  return all;
});
