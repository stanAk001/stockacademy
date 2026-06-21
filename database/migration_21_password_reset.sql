-- ============================================================
-- migration_21_password_reset.sql
-- "Forgot password" — reset via an emailed one-time token.
--   • token_hash = SHA-256 of the raw token we email (the raw token is
--     NEVER stored, so a DB leak can't be used to reset anyone's password)
--   • single-use (used_at) + short expiry (expires_at)
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id);
