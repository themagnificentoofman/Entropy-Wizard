import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const analysisQuota = sqliteTable('analysis_quota', {
  userId: text('user_id').primaryKey(),
  windowStart: integer('window_start').notNull(),
  requestCount: integer('request_count').notNull(),
});
