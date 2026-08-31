-- Migration number: 0014  2026-02-16
ALTER TABLE users ADD COLUMN digital_signature_data TEXT;
