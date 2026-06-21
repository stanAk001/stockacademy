-- ============================================================
-- migration_20_quiz_pass_60.sql
-- Lower the quiz passing mark from 70% to 60%.
--   • new quizzes default to 60
--   • existing quizzes that were at 70 move to 60
-- ============================================================

ALTER TABLE quizzes ALTER COLUMN passing_score SET DEFAULT 60;
UPDATE quizzes SET passing_score = 60 WHERE passing_score = 70;
