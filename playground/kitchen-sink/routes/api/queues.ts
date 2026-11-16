import { queueResults } from '@schema';
import { defineHandler } from 'void';
import { db, desc, eq } from 'void/db';
import { queues } from 'void/queues';

export const GET = defineHandler(() =>
  db.select().from(queueResults).orderBy(desc(queueResults.id)).limit(50),
);

export const POST = defineHandler(async (c) => {
  const body = await c.req.json<{ intent?: 'delete'; key?: string; value?: string; id?: number }>();
  if (body.intent === 'delete') {
    await db.delete(queueResults).where(eq(queueResults.id, body.id ?? 0));
  } else {
    await queues['demo-queue'].send({ key: body.key ?? '', value: body.value ?? '' });
  }
  return { ok: true };
});
