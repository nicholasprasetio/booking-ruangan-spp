-- Migration: Add user_roles junction table for multi-role support
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- Migrate existing role_id data to user_roles
INSERT OR IGNORE INTO user_roles (user_id, role_id, created_at)
SELECT id, role_id, COALESCE(created_at, CURRENT_TIMESTAMP)
FROM users
WHERE role_id IS NOT NULL AND deleted_at IS NULL;
