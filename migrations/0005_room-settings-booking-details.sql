-- Migration number: 0005  2026-01-24
PRAGMA foreign_keys = ON;

ALTER TABLE rooms ADD COLUMN open_time_start TEXT;
ALTER TABLE rooms ADD COLUMN open_time_end TEXT;
ALTER TABLE rooms ADD COLUMN slot_minutes INTEGER;

ALTER TABLE bookings ADD COLUMN activity_name TEXT;
ALTER TABLE bookings ADD COLUMN participant_count INTEGER;
ALTER TABLE bookings ADD COLUMN notes TEXT;
