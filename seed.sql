-- Roles
INSERT INTO roles (name, created_at, updated_at)
VALUES
('admin', datetime('now'), datetime('now')),
('user',  datetime('now'), datetime('now'));


-- Superadmin, password: "password"
INSERT INTO users (
  phone_number, email, fullname, password, is_verified,
  created_at, updated_at, created_by, role_id
)
VALUES
('62812345678', 'admin@paroki.id', 'admin', 'pbkdf2_sha256$100000$EzygW-A7jnoKBNuSJaYNQA$q54czWHTSR_LSS4KS7p-De8G4__FlUTuTRE1sXw8o0Y', 1, datetime('now'), datetime('now'), 'system', 1);
