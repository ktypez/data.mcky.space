-- Migration 0001: Unique constraint on lower(client name)
-- C3 fix: previously client-name uniqueness was client-side only
-- (Jaro-Winkler in AddClientForm), bypassable via direct API calls.
-- This index enforces uniqueness at the DB level.
--
-- Pre-flight: confirm no existing duplicates before applying.
--   SELECT lower(name) AS lname, COUNT(*) AS cnt
--   FROM clients
--   GROUP BY lower(name)
--   HAVING cnt > 1;
-- If rows return, resolve manually before running this migration.

CREATE UNIQUE INDEX IF NOT EXISTS clients_name_lower_idx
  ON clients(lower(name));
