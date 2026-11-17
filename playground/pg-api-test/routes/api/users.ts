import { users } from '@schema';
import { defineHandler } from 'nosam';
import { db } from 'nosam/db';

export const GET = defineHandler(async () => {
  const all = await db.select().from(users);
  return all;
});
