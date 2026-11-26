-- ===== Suggestions system removal =====
-- The suggestions feature (guest "แจ้งแก้ไขข้อมูล" + admin approve flow) was
-- removed entirely. This drops the table, its indexes, and its FK.
-- Apply manually: `npm run wrangler -- d1 execute <db> --file=drizzle/migrations/0004_drop_suggestions.sql`
DROP TABLE IF EXISTS `suggestions`;--> statement-breakpoint