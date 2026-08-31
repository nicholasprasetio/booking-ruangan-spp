-- Migration number: 0002  2026-01-20
PRAGMA foreign_keys = ON;

-- Ensure one account per phone number
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number_unique
ON users(phone_number);

