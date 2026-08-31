-- Migration number: 0028  2026-07-08
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO permissions (code, name, description, category, default_granted)
VALUES
  ('menu.security_keys', 'Satpam / Kunci Ruangan', 'Akses dashboard dan scanner kunci ruangan', 'Security', 0),
  ('menu.display_rooms', 'Display Jadwal Ruangan', 'Akses tampilan TV jadwal ruangan', 'Display', 0);

INSERT INTO roles (name, created_at, updated_at)
SELECT 'satpam', datetime('now'), datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'satpam');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, datetime('now')
FROM roles r
JOIN permissions p ON p.code IN ('menu.security_keys', 'menu.display_rooms')
WHERE r.name = 'admin';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, datetime('now')
FROM roles r
JOIN permissions p ON p.code = 'menu.security_keys'
WHERE r.name = 'satpam';

CREATE TABLE IF NOT EXISTS booking_key_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL
    REFERENCES bookings (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  occurrence_id INTEGER NOT NULL
    REFERENCES booking_occurrences (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  picked_up_at DATETIME,
  picked_up_by INTEGER
    REFERENCES users (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  returned_at DATETIME,
  returned_by INTEGER
    REFERENCES users (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(occurrence_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_key_tokens_booking_id
  ON booking_key_tokens (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_key_tokens_occurrence_id
  ON booking_key_tokens (occurrence_id);

CREATE INDEX IF NOT EXISTS idx_booking_key_tokens_token
  ON booking_key_tokens (token);

CREATE TABLE IF NOT EXISTS booking_key_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_token_id INTEGER NOT NULL
    REFERENCES booking_key_tokens (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  booking_id INTEGER NOT NULL
    REFERENCES bookings (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  occurrence_id INTEGER NOT NULL
    REFERENCES booking_occurrences (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  actor_user_id INTEGER
    REFERENCES users (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  type TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_key_events_token_id
  ON booking_key_events (key_token_id);

CREATE INDEX IF NOT EXISTS idx_booking_key_events_occurrence_id
  ON booking_key_events (occurrence_id);

ALTER TABLE booking_occurrences ADD COLUMN room_id INTEGER REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_booking_occurrences_room_id
  ON booking_occurrences (room_id);

ALTER TABLE approval_documents ADD COLUMN root_document_id INTEGER;
ALTER TABLE approval_documents ADD COLUMN previous_document_id INTEGER;
ALTER TABLE approval_documents ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE approval_documents ADD COLUMN verification_token TEXT;
ALTER TABLE approval_documents ADD COLUMN approved_at DATETIME;

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_documents_verification_token
  ON approval_documents (verification_token)
  WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_documents_root_document_id
  ON approval_documents (root_document_id);

ALTER TABLE approval_workflows ADD COLUMN notify_preference TEXT NOT NULL DEFAULT 'none';
