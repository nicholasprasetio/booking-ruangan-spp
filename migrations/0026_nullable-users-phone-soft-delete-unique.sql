-- Migration number: 0026  2026-07-07
PRAGMA foreign_keys = ON;

DROP INDEX IF EXISTS idx_users_phone_number_unique;

ALTER TABLE users DROP COLUMN phone_number;

ALTER TABLE users ADD COLUMN phone_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number_unique
ON users(phone_number)
WHERE phone_number IS NOT NULL
  AND deleted_at IS NULL;
