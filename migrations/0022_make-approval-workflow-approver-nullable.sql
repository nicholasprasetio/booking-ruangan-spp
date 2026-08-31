-- Migration number: 0022  2026-05-12
-- Rebuild approval_workflows so approver_id is explicitly nullable.
-- SQLite/D1 does not support ALTER COLUMN.

PRAGMA defer_foreign_keys = ON;

CREATE TABLE approval_workflows_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  level INTEGER NOT NULL,
  approver_id INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  signature_data TEXT,
  signed_at DATETIME,
  rejection_reason TEXT,
  is_checked BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_required BOOLEAN DEFAULT TRUE,
  approver_role_id INTEGER DEFAULT NULL,
  FOREIGN KEY (document_id) REFERENCES approval_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(document_id, level, approver_id)
);

INSERT INTO approval_workflows_new (
  id,
  document_id,
  level,
  approver_id,
  status,
  signature_data,
  signed_at,
  rejection_reason,
  is_checked,
  created_at,
  updated_at,
  is_required,
  approver_role_id
)
SELECT
  id,
  document_id,
  level,
  NULLIF(approver_id, 0),
  status,
  signature_data,
  signed_at,
  rejection_reason,
  is_checked,
  created_at,
  updated_at,
  is_required,
  approver_role_id
FROM approval_workflows;

DROP TABLE approval_workflows;

ALTER TABLE approval_workflows_new RENAME TO approval_workflows;

CREATE INDEX IF NOT EXISTS idx_approval_workflows_document_id ON approval_workflows(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_approver_id ON approval_workflows(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_role_id ON approval_workflows(approver_role_id);

PRAGMA defer_foreign_keys = OFF;
