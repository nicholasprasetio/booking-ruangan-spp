-- Migration number: 0029  2026-07-09
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS approval_rejected_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL
    REFERENCES approval_documents (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  workflow_id INTEGER
    REFERENCES approval_workflows (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  history_id INTEGER
    REFERENCES approval_history (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  rejection_reason TEXT,
  rejected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_rejected_files_document_id
  ON approval_rejected_files (document_id);

CREATE INDEX IF NOT EXISTS idx_approval_rejected_files_history_id
  ON approval_rejected_files (history_id);
