-- Migration number: 0010  2026-01-31
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL
    REFERENCES bookings (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  actor_user_id INTEGER
    REFERENCES users (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  type TEXT NOT NULL,
  payload TEXT,
  created_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id
  ON booking_events (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_events_created_at
  ON booking_events (created_at);
