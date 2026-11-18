import { defineHandler } from '@buildwf/bwf';
import { db } from '@buildwf/bwf/db';
import { users } from '@schema';
import * as v from 'valibot';

export const GET = defineHandler(async () => {
  return db.select().from(users);
});

export const POST = defineHandler.withValidator({
  body: v.object({
    name: v.pipe(v.string(), v.minLength(1)),
    email: v.pipe(v.string(), v.email()),
  }),
})(async (c, { body }) => {
  await db.insert(users).values({ name: body.name, email: body.email });
  return { created: true };
});
