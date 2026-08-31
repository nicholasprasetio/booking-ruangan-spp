-- Migration number: 0003  2026-01-21
PRAGMA foreign_keys = ON;

-- Add role_id to users
ALTER TABLE users ADD COLUMN role_id INTEGER;

-- Seed minimal roles (id will be auto)
INSERT INTO roles (name, created_at, updated_at)
SELECT 'admin', datetime('now'), datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, created_at, updated_at)
SELECT 'user', datetime('now'), datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user');

-- Default all existing users to 'user' role if empty
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'user' LIMIT 1)
WHERE role_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

