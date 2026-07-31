-- Migration 0002: add FK from suggestions.client_id → clients.id
-- Generated 2026-07-31
--
-- Prerequisite: 0001_indexes_audit_log.sql applied.
-- Pre-flight:
--   SELECT s.id, s.client_id, s.status FROM suggestions s
--   LEFT JOIN clients c ON s.client_id = c.id WHERE c.id IS NULL;
-- If any rows return, resolve them first (this script DELETES all
-- orphan suggestions — they are 2 historical test rows in current data
-- and all have terminal status).

-- Cleanup step: delete orphan suggestions so the FK can be created.
-- Safe because orphan suggestions in current data are all terminal
-- (rejected/approved) — they no longer affect any UI state.
DELETE FROM suggestions
WHERE id IN (
  SELECT s.id FROM suggestions s
  LEFT JOIN clients c ON s.client_id = c.id
  WHERE c.id IS NULL
);

-- H3: add FK constraint
-- SQLite/D1 doesn't support ALTER TABLE ADD CONSTRAINT for FKs, so we
-- rebuild the table. Column order matches the live schema (suggested_photo
-- was added later via ALTER TABLE, hence its position at the end).
PRAGMA foreign_keys = OFF;

CREATE TABLE `suggestions_new` (
  `id` text PRIMARY KEY NOT NULL,
  `client_id` text NOT NULL,
  `suggested` text NOT NULL,
  `original` text,
  `status` text DEFAULT 'pending' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `suggested_photo` text,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `suggestions_new` (id, client_id, suggested, original, status, created_at, updated_at, suggested_photo)
SELECT id, client_id, suggested, original, status, created_at, updated_at, suggested_photo
FROM `suggestions`;

DROP TABLE `suggestions`;

ALTER TABLE `suggestions_new` RENAME TO `suggestions`;

-- Recreate indexes that were on the old table
CREATE INDEX IF NOT EXISTS `suggestions_client_id_idx` ON `suggestions` (`client_id`);
CREATE INDEX IF NOT EXISTS `suggestions_status_idx` ON `suggestions` (`status`);
CREATE INDEX IF NOT EXISTS `suggestions_client_status_idx` ON `suggestions` (`client_id`,`status`);

PRAGMA foreign_keys = ON;
