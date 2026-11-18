import { pgTable, serial, text } from '@buildwf/bwf/schema-pg';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});
