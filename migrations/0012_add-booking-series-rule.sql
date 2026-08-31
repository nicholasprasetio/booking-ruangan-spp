-- Migration number: 0012  2026-01-31
PRAGMA foreign_keys = ON;

ALTER TABLE booking_series ADD COLUMN rule_json TEXT;

