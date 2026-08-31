-- Migration: Add role-based approval support to approval_workflows
-- When approver_role_id is set, any user with that role can approve at this level.
-- approver_id will be 0 (placeholder) until a user with the matching role signs.

ALTER TABLE approval_workflows ADD COLUMN approver_role_id INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_workflows_role_id ON approval_workflows(approver_role_id);
