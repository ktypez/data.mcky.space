-- Migration 0003: namespace trash keys as `trash:v1:<id>`
-- Generated 2026-07-31
--
-- M5 fix: previously the settings table used `trash_<id>` and the
-- cleanup endpoint used `LIKE 'trash_%'`. That pattern risks false
-- positives if any future setting key happens to start with `trash_`.
-- New namespace is `trash:v1:<id>` (versioned, colon-separated, longer).
-- On the data side this is a one-time key rename; no app-visible state.

UPDATE `settings`
SET `key` = 'trash:v1:' || SUBSTR(`key`, 7)
WHERE `key` LIKE 'trash_%' AND `key` NOT LIKE 'trash:v1:%';
