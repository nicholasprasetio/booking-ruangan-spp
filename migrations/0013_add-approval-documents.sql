-- Create approval_documents table
CREATE TABLE IF NOT EXISTS approval_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending, approved, rejected
  current_level INTEGER DEFAULT 0,
  total_levels INTEGER NOT NULL,
  final_document_path TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create approval_workflow table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  level INTEGER NOT NULL,
  approver_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, skipped
  signature_data TEXT, -- Base64 signature image
  signed_at DATETIME,
  rejection_reason TEXT,
  is_checked BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES approval_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(document_id, level, approver_id)
);

-- Create approval_history table for audit trail
CREATE TABLE IF NOT EXISTS approval_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  workflow_id INTEGER,
  action TEXT NOT NULL, -- created, submitted, approved, rejected, signed
  performed_by INTEGER NOT NULL,
  notes TEXT,
  metadata TEXT, -- JSON for additional data
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES approval_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_approval_documents_created_by ON approval_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_approval_documents_status ON approval_documents(status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_document_id ON approval_workflows(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_approver_id ON approval_workflows(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_history_document_id ON approval_history(document_id);
