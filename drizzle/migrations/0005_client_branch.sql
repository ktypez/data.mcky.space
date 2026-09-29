-- Migration 0005: add the `branch` (สาขา) column to clients
-- Generated 2026-09-29
--
-- One free-text branch per client, shown right after the shop name in the
-- catalog, record, and copy output. Existing rows get '' (no branch).
-- NOT NULL DEFAULT '' matches the `address` column style and keeps every
-- read path a plain string with no null checks.

ALTER TABLE `clients` ADD COLUMN `branch` TEXT NOT NULL DEFAULT '';
