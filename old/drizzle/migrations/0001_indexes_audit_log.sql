-- Migration 0001: schema additions for H2 (indexes), H3 (FK), L1 (audit log)
-- Generated 2026-07-31
--
-- Pre-flight:
--   1. Check for orphan suggestions (FK would fail):
--      SELECT s.id, s.client_id FROM suggestions s
--      LEFT JOIN clients c ON s.client_id = c.id WHERE c.id IS NULL;
--   2. Resolve or delete them (this migration is safe on clean data)

-- ===== H2 + L1: new tables and indexes =====

-- L1: audit_log table
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` text PRIMARY KEY NOT NULL,
  `actor` text,
  `action` text NOT NULL,
  `target` text,
  `payload` text,
  `ip` text,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `audit_log_created_at_idx` ON `audit_log` (`created_at`);
CREATE INDEX IF NOT EXISTS `audit_log_action_idx` ON `audit_log` (`action`);
CREATE INDEX IF NOT EXISTS `audit_log_target_idx` ON `audit_log` (`target`);

-- H2: indexes on suggestions (perf)
CREATE INDEX IF NOT EXISTS `suggestions_client_id_idx` ON `suggestions` (`client_id`);
CREATE INDEX IF NOT EXISTS `suggestions_status_idx` ON `suggestions` (`status`);
CREATE INDEX IF NOT EXISTS `suggestions_client_status_idx` ON `suggestions` (`client_id`,`status`);

-- ===== H3: FK from suggestions.client_id to clients.id =====
-- Applied in a separate file (0002) so the cleanup step in between
-- can run without breaking the atomicity of this file.
