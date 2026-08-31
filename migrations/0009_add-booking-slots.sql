-- Migration number: 0009 	 2026-01-28T16:29:02.821Z
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS booking_slots
(
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER  NOT NULL
        REFERENCES bookings (id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
    start_at   DATETIME NOT NULL,
    end_at     DATETIME NOT NULL,
    CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_booking_id
    ON booking_slots (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_slots_time
    ON booking_slots (start_at, end_at);
