import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const topics = pgTable('topics', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  queries: jsonb('queries').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow()
});