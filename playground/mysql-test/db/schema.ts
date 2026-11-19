import { int, mysqlTable, varchar } from '@builtbyfriends/bwf/schema-mysql';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
});
