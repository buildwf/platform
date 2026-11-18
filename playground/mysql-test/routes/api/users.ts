import { defineHandler } from '@buildwf/bwf';
import { db } from '@buildwf/bwf/db';
import { users } from '@schema';

export const GET = defineHandler(async () => {
  const all = await db.select().from(users);
  return all;
});
