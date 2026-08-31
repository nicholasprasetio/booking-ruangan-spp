-- Migration number: 0006  2026-01-24
PRAGMA foreign_keys = ON;

ALTER TABLE bookings ADD COLUMN rejection_reason TEXT;
