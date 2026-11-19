import { defineHandler } from '@builtbyfriends/bwf';
import { db, desc } from '@builtbyfriends/bwf/db';
import { insertNoteSchema, notes } from '@schema';

export const GET = defineHandler(() => db.select().from(notes).orderBy(desc(notes.id)));

export const POST = defineHandler.withValidator({ body: insertNoteSchema })(async (
  _c,
  { body },
) => {
  await db.insert(notes).values(body);
  return { ok: true };
});
