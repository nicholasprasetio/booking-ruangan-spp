-- Migration number: 0004  2026-01-24
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS room_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT,
  byte_size INTEGER,
  created_at DATETIME,
  deleted_at DATETIME,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_room_photos_room_id ON room_photos(room_id);
