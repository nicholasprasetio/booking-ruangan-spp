-- Migration: Add permissions and role_permissions tables
PRAGMA foreign_keys = ON;

-- PERMISSIONS table - stores available permissions (per menu)
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ROLE_PERMISSIONS table - maps roles to permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Seed default permissions (per menu)
INSERT INTO permissions (code, name, description, category) VALUES
  ('menu.book_room', 'Pinjam Ruangan', 'Akses menu pinjam ruangan', 'Menu'),
  ('menu.my_bookings', 'Peminjaman Saya', 'Akses menu peminjaman saya', 'Menu'),
  ('menu.profile', 'Profil Saya', 'Akses menu profil', 'Menu'),
  ('menu.approval_document', 'Persetujuan Dokumen', 'Akses menu persetujuan dokumen', 'Menu'),
  ('menu.admin_bookings', 'Admin: Semua Peminjaman', 'Akses menu admin peminjaman', 'Admin'),
  ('menu.admin_rooms', 'Admin: Manajemen Ruangan', 'Akses menu admin ruangan', 'Admin'),
  ('menu.admin_calendar', 'Admin: Kalender Ruangan', 'Akses menu admin kalender', 'Admin'),
  ('menu.admin_users', 'Admin: Manajemen Pengguna', 'Akses menu admin pengguna', 'Admin'),
  ('menu.admin_roles', 'Admin: Manajemen Role', 'Akses menu admin role & permission', 'Admin'),
  ('menu.admin_permissions', 'Admin: Manajemen Permission', 'Akses menu admin permission', 'Admin');

-- Grant all permissions to admin role (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 1, id, datetime('now') FROM permissions;

-- Grant basic permissions to user role (role_id = 2)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 2, id, datetime('now') FROM permissions WHERE code IN (
  'menu.book_room',
  'menu.my_bookings',
  'menu.profile',
  'menu.approval_document'
);
