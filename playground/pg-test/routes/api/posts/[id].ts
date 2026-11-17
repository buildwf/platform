import { posts } from '@schema';
import { defineHandler } from 'nosam';
import { db, eq } from 'nosam/db';

export const DELETE = defineHandler(async (c) => {
  const [deleted] = await db
    .delete(posts)
    .where(eq(posts.id, Number(c.req.param('id'))))
    .returning();
  if (!deleted) {
    return c.json({ error: 'Not found' }, 404);
  }
  return deleted;
});
