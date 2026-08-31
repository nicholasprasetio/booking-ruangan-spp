-- Migration number: 0008  2026-01-25
PRAGMA foreign_keys = ON;

-- Ensure one account per email (ignore NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
ON users(email)
WHERE email IS NOT NULL;
