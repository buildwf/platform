import { defineHandler } from '@builtbyfriends/bwf';
import { db, eq } from '@builtbyfriends/bwf/db';
import { notes } from '@schema';

export const DELETE = defineHandler(async (c) => {
  await db.delete(notes).where(eq(notes.id, Number(c.req.param('id'))));
  return { ok: true };
});
