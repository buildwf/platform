import { sql } from '@buildwf/bwf/db';
import { sqliteTable, integer, text } from '@buildwf/bwf/schema-d1';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
