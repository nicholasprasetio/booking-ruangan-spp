-- Migration number: 0021  2026-02-02
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO permissions (code, name, description, category, default_granted)
VALUES (
  'menu.my_calendar',
  'Kalender Saya',
  'Akses menu kalender peminjaman pribadi',
  'Menu',
  1
);

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM permissions p
WHERE p.code = 'menu.my_calendar';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT 2, p.id, CURRENT_TIMESTAMP
FROM permissions p
WHERE p.code = 'menu.my_calendar';
