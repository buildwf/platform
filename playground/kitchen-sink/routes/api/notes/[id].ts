import { notes } from '@schema';
import { defineHandler } from 'void';
import { db, eq } from 'void/db';

export const DELETE = defineHandler(async (c) => {
  await db.delete(notes).where(eq(notes.id, Number(c.req.param('id'))));
  return { ok: true };
});
