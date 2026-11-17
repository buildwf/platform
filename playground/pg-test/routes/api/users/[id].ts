import { posts, users } from '@schema';
import { defineHandler } from 'nosam';
import { db, eq } from 'nosam/db';

export const GET = defineHandler(async (c) => {
  const id = Number(c.req.param('id'));
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) {
    return c.json({ error: 'Not found' }, 404);
  }
  return user;
});

export const PUT = defineHandler(async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json<{ name?: string; email?: string; active?: boolean }>();
  const [updated] = await db.update(users).set(body).where(eq(users.id, id)).returning();
  if (!updated) {
    return c.json({ error: 'Not found' }, 404);
  }
  return updated;
});

export const DELETE = defineHandler(async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(posts).where(eq(posts.authorId, id));
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
  if (!deleted) {
    return c.json({ error: 'Not found' }, 404);
  }
  return deleted;
});
