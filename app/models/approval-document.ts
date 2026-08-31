export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type WorkflowStatus = 'pending' | 'approved' | 'rejected' | 'skipped'
export type ApprovalAction = 'created' | 'submitted' | 'approved' | 'rejected' | 'signed' | 'revised'

export interface ApprovalDocument {
  id: number
  title: string
  description?: string
  file_path: string
  file_name: string
  file_size: number
  created_by: number
  creator_name: string
  creator_email: string
  status: DocumentStatus
  current_level: number
  total_levels: number
  final_document_path?: string
  created_at: string
  updated_at: string
  root_document_id?: number | null
  previous_document_id?: number | null
  revision_number?: number
  verification_token?: string | null
  approved_at?: string | null
  my_level?: number
  my_status?: string
  // Relations
  //   creator?: {
  //     id: number
  //     fullname: string
  //     email: string
  //   }
  workflows?: ApprovalWorkflow[]
  history?: ApprovalHistory[]
  level_settings?: LevelSettings[]
  revisions?: ApprovalDocument[]
  is_creator?: boolean
}

export interface ApprovalWorkflow {
  id: number
  document_id: number
  level: number
  approver_id: number | null
  approver_name?: string
  approver_role_id?: number | null
  approver_role_name?: string
  status: WorkflowStatus
  signature_data?: string
  signed_at?: string
  rejection_reason?: string
  is_checked: boolean
  is_required: boolean
  notify_preference?: 'final' | 'all' | 'none'
  created_at: string
  updated_at: string
  // Relations
  approver?: {
    id: number
    fullname: string
    email: string
    phone: string
  }
}

export interface LevelSettings {
  level: number
  min_approvals: number
}

export interface ApprovalHistory {
  id: number
  document_id: number
  workflow_id?: number
  action: ApprovalAction
  performed_by: number
  notes?: string
  metadata?: string
  created_at: string
  // Relations
  performer_name?: string
  performer_email?: string
  rejected_file_id?: number | null
  rejected_file_name?: string | null
  rejected_file_revision_number?: number | null
  // performer?: {
  //   id: number
  //   fullname: string
  //   email: string
  // }
}

export interface CreateDocumentRequest {
  title: string
  description?: string
  file: File
  approvers: ApprovalWorkflowRequest[]
}

export interface ApprovalWorkflowRequest {
  level: number
  approver_id: number | null
  is_required: boolean
  approver_role_id?: number | null
  notify_preference?: 'final' | 'all' | 'none'
}

export interface LevelSettingsRequest {
  level: number
  min_approvals: number
}

export interface ApproveDocumentRequest {
  signature_data: string
  notes?: string
}

export interface RejectDocumentRequest {
  rejection_reason: string
}
