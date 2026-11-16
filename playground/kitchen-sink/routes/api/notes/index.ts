import { insertNoteSchema, notes } from '@schema';
import { defineHandler } from 'void';
import { db, desc } from 'void/db';

export const GET = defineHandler(() => db.select().from(notes).orderBy(desc(notes.id)));

export const POST = defineHandler.withValidator({ body: insertNoteSchema })(async (
  _c,
  { body },
) => {
  await db.insert(notes).values(body);
  return { ok: true };
});
