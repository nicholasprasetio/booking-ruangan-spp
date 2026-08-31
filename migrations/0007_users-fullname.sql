-- Migration number: 0007  2026-01-25
PRAGMA foreign_keys = ON;

-- Rename username to fullname
ALTER TABLE users RENAME COLUMN username TO fullname;
