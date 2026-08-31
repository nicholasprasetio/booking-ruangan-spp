-- Migration number: 0020  2026-02-02
PRAGMA foreign_keys = OFF;

-- Rebuild booking domain as parent booking + occurrences + slots
DROP TABLE IF EXISTS booking_occurrence_slots;
DROP TABLE IF EXISTS booking_occurrences;
DROP TABLE IF EXISTS booking_events;
DROP TABLE IF EXISTS booking_slots;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS booking_series;

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL
    REFERENCES users (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  room_id INTEGER NOT NULL
    REFERENCES rooms (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending',
  activity_name TEXT,
  participant_count INTEGER,
  notes TEXT,
  rejection_reason TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  series_id INTEGER,
  hours INTEGER,
  start_date DATETIME,
  end_date DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME,
  created_by TEXT,
  updated_by TEXT,
  CHECK (participant_count IS NULL OR participant_count >= 1)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON bookings (user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_room_id
  ON bookings (room_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings (status);

CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at
  ON bookings (deleted_at);

CREATE INDEX IF NOT EXISTS idx_bookings_series_id
  ON bookings (series_id);

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
  rule_json TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_series_user_id
  ON booking_series (user_id);

CREATE INDEX IF NOT EXISTS idx_booking_series_room_id
  ON booking_series (room_id);

CREATE TABLE IF NOT EXISTS booking_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL
    REFERENCES bookings (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  rejection_reason TEXT,
  cancel_reason TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_booking_occurrences_booking_id
  ON booking_occurrences (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_occurrences_status
  ON booking_occurrences (status);

CREATE INDEX IF NOT EXISTS idx_booking_occurrences_start_at
  ON booking_occurrences (start_at);

CREATE INDEX IF NOT EXISTS idx_booking_occurrences_booking_status
  ON booking_occurrences (booking_id, status);

CREATE TABLE IF NOT EXISTS booking_occurrence_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurrence_id INTEGER NOT NULL
    REFERENCES booking_occurrences (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_booking_occurrence_slots_occurrence_id
  ON booking_occurrence_slots (occurrence_id);

CREATE INDEX IF NOT EXISTS idx_booking_occurrence_slots_time
  ON booking_occurrence_slots (start_at, end_at);

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL
    REFERENCES bookings (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  occurrence_id INTEGER
    REFERENCES booking_occurrences (id)
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

CREATE INDEX IF NOT EXISTS idx_booking_events_occurrence_id
  ON booking_events (occurrence_id);

CREATE INDEX IF NOT EXISTS idx_booking_events_created_at
  ON booking_events (created_at);

PRAGMA foreign_keys = ON;
