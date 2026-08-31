-- Migration number: 0027  2026-07-08
ALTER TABLE rooms ADD COLUMN available_for_booking INTEGER NOT NULL DEFAULT 1;
