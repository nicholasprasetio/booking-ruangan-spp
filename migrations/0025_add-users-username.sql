-- Migration number: 0025  2026-07-07
PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
ON users(username)
WHERE username IS NOT NULL;
