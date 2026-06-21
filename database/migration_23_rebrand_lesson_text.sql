-- ============================================================
-- migration_23_rebrand_lesson_text.sql
-- Rebrand follow-up: lesson content already stored in the database still
-- referenced the old name ("...the StockAcademy simulator..."). Renaming the
-- migration source files doesn't touch rows already inserted, so this one-off
-- UPDATE rewrites the live text to "StockAcademia".
-- ============================================================

UPDATE lessons
SET content = REPLACE(content, 'StockAcademy', 'StockAcademia')
WHERE content LIKE '%StockAcademy%';
