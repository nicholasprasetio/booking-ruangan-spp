-- Add is_required column to approval_workflows
ALTER TABLE approval_workflows ADD COLUMN is_required BOOLEAN DEFAULT TRUE;

-- Create approval_level_settings table for per-level configuration
CREATE TABLE IF NOT EXISTS approval_level_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  level INTEGER NOT NULL,
  min_approvals INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES approval_documents(id) ON DELETE CASCADE,
  UNIQUE(document_id, level)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_approval_level_settings_document ON approval_level_settings(document_id, level);
