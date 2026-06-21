-- ============================================
-- StockAcademia — Premium upgrade payment tracking
-- Run after migration_04_lesson_visuals_sample.sql
-- ============================================

CREATE TABLE IF NOT EXISTS plan_upgrades (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reference VARCHAR(50) UNIQUE NOT NULL,
    amount_kobo INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | paid | failed
    paystack_reference VARCHAR(150),
    return_to TEXT,             -- optional URL to redirect to after success
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_plan_upgrade_status CHECK (status IN ('pending','paid','failed'))
);

CREATE INDEX IF NOT EXISTS idx_plan_upgrades_user ON plan_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_upgrades_ref ON plan_upgrades(reference);
