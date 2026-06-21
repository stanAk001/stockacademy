-- ============================================================
-- migration_16_forum_images.sql
-- Make forum posts more flexible (social-style):
--   • title and content are now optional — a post needs at least
--     ONE of: title, content, or an image (enforced in the API).
--   • add image_url for attached images (stored as a data URL).
-- ============================================================

ALTER TABLE forum_posts ALTER COLUMN title DROP NOT NULL;
ALTER TABLE forum_posts ALTER COLUMN content DROP NOT NULL;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
