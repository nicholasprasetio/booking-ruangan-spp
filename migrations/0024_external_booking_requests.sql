-- Migration number: 0024  2026-06-14
PRAGMA foreign_keys = ON;

ALTER TABLE bookings ADD COLUMN external_request_id INTEGER;
ALTER TABLE bookings ADD COLUMN external_requester_name TEXT;
ALTER TABLE bookings ADD COLUMN external_requester_phone TEXT;
ALTER TABLE bookings ADD COLUMN external_origin_environment TEXT;

CREATE TABLE IF NOT EXISTS external_booking_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_name TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  origin_environment TEXT,
  purpose TEXT NOT NULL,
  participant_count INTEGER NOT NULL,
  notes TEXT,
  room_id INTEGER NOT NULL
    REFERENCES rooms (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  request_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slots_json TEXT NOT NULL,
  request_letter_object_key TEXT,
  request_letter_file_name TEXT,
  request_letter_content_type TEXT,
  request_letter_file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  accepted_booking_id INTEGER
    REFERENCES bookings (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  reviewed_by INTEGER
    REFERENCES users (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  reviewed_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CHECK (participant_count >= 1),
  CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_external_booking_requests_status
  ON external_booking_requests (status);

CREATE INDEX IF NOT EXISTS idx_external_booking_requests_room_date
  ON external_booking_requests (room_id, request_date);

CREATE INDEX IF NOT EXISTS idx_external_booking_requests_created_at
  ON external_booking_requests (created_at);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES
  ('external_booking_letter_template_object_key', '', datetime('now')),
  ('external_booking_letter_template_file_name', '', datetime('now')),
  ('external_booking_letter_template_content_type', '', datetime('now')),
  ('external_booking_letter_template_file_size', '0', datetime('now')),
  ('external_booking_letter_template_updated_at', '', datetime('now'));

INSERT OR IGNORE INTO permissions (code, name, description, category, default_granted)
VALUES (
  'menu.admin_external_bookings',
  'Admin: Pengajuan Booking External',
  'Akses menu pengajuan booking external',
  'Admin',
  0
);

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, datetime('now')
FROM roles r
JOIN permissions p ON p.code = 'menu.admin_external_bookings'
WHERE r.name = 'admin'
  AND r.deleted_at IS NULL;

INSERT OR IGNORE INTO users (fullname, phone_number, email, password, is_verified, created_at, updated_at)
VALUES ('External Requester', 'external-requester', 'external-requester@local.invalid', '', 1, datetime('now'), datetime('now'));
