-- Migration number: 0011  2026-01-31
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS booking_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL
    REFERENCES users (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  room_id INTEGER NOT NULL
    REFERENCES rooms (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  frequency TEXT NOT NULL,
  interval INTEGER NOT NULL DEFAULT 1,
  start_date TEXT NOT NULL,
  until_date TEXT NOT NULL,
  slots_json TEXT NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_series_user_id
  ON booking_series (user_id);

CREATE INDEX IF NOT EXISTS idx_booking_series_room_id
  ON booking_series (room_id);

ALTER TABLE bookings ADD COLUMN series_id INTEGER
  REFERENCES booking_series (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_series_id
  ON bookings (series_id);

