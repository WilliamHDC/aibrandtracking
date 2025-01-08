import { pgTable, text, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';

// Update projects table to match existing structure
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  brand: text('brand'),
  competitors: jsonb('competitors'),
  brands: jsonb('brands'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Update topics table
export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  projectId: text('project_id').references(() => projects.id),
  queries: jsonb('queries').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Update analysis_results
export const analysisResults = pgTable('analysis_results', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  topicId: serial('topic_id').references(() => topics.id),
  results: jsonb('results'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}); 