-- Migration number: 0023  2026-06-14
PRAGMA foreign_keys = ON;

-- General application settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL
);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('booking_min_lead_days', '0', datetime('now'));

-- Request letter attachment metadata for room bookings
ALTER TABLE bookings ADD COLUMN request_letter_object_key TEXT;
ALTER TABLE bookings ADD COLUMN request_letter_file_name TEXT;
ALTER TABLE bookings ADD COLUMN request_letter_content_type TEXT;
ALTER TABLE bookings ADD COLUMN request_letter_file_size INTEGER;

-- Admin settings menu permission
INSERT OR IGNORE INTO permissions (code, name, description, category, default_granted)
VALUES (
  'menu.admin_settings',
  'Admin: Pengaturan Umum',
  'Akses menu pengaturan umum',
  'Admin',
  0
);

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, datetime('now')
FROM roles r
JOIN permissions p ON p.code = 'menu.admin_settings'
WHERE r.name = 'admin'
  AND r.deleted_at IS NULL;
