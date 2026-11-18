import { sql } from '@buildwf/bwf/db';
import { createInsertSchema, createSelectSchema } from '@buildwf/bwf/drizzle-valibot';
import { sqliteTable, integer, text } from '@buildwf/bwf/schema-d1';
import { minLength, pick, pipe } from 'valibot';

export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const insertNoteSchema = createInsertSchema(notes, {
  title: (schema) => pipe(schema, minLength(1, 'Title is required')),
});

const selectNoteSchema = createSelectSchema(notes);
export const noteIdSchema = pick(selectNoteSchema, ['id']);

export const queueResults = sqliteTable('queue_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),
  value: text('value').notNull().default(''),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
