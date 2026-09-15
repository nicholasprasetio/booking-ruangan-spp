-- Migration number: 0030  2026-09-15
PRAGMA foreign_keys = ON;

ALTER TABLE rooms ADD COLUMN is_combined INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS room_combined_members (
  combined_room_id INTEGER NOT NULL
    REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  member_room_id INTEGER NOT NULL
    REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (combined_room_id, member_room_id),
  CHECK (combined_room_id != member_room_id)
);

CREATE INDEX IF NOT EXISTS idx_room_combined_members_member
  ON room_combined_members(member_room_id);
