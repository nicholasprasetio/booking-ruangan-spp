-- Migration: Add default_granted column to permissions
-- When creating a new role, permissions with default_granted = 1 will be auto-assigned

ALTER TABLE permissions ADD COLUMN default_granted INTEGER NOT NULL DEFAULT 0;

-- Set default_granted for basic user permissions
UPDATE permissions SET default_granted = 1 WHERE code IN (
  'menu.book_room',
  'menu.my_bookings',
  'menu.profile',
  'menu.approval_document'
);
