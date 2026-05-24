-- Add full legal name to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name_legal VARCHAR(255);

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certificate_number VARCHAR(50) UNIQUE NOT NULL,
  verification_token VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW(),
  payment_reference VARCHAR(255),
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  was_free BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_token ON certificates(verification_token);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);