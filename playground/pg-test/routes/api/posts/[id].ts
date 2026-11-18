import { defineHandler } from '@buildwf/bwf';
import { db, eq } from '@buildwf/bwf/db';
import { posts } from '@schema';

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
