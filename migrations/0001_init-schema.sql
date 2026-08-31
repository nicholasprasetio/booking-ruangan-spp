-- Migration number: 0001  2026-01-16
PRAGMA foreign_keys = ON;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  email TEXT,
  username TEXT,
  password TEXT,
  is_verified INTEGER,
  phone_number_verified TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  created_by TEXT,
  updated_by TEXT
);

-- ROLES
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  created_by TEXT,
  updated_by TEXT
);

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  location TEXT,
  capacity INTEGER,
  description TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  created_by TEXT,
  updated_by TEXT
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  hours INTEGER CHECK (hours > 0 AND hours <= 24),
  status TEXT,
  start_date DATETIME,
  end_date DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

