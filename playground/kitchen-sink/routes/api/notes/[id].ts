import { notes } from '@schema';
import { defineHandler } from 'nosam';
import { db, eq } from 'nosam/db';

export const DELETE = defineHandler(async (c) => {
  await db.delete(notes).where(eq(notes.id, Number(c.req.param('id'))));
  return { ok: true };
});
