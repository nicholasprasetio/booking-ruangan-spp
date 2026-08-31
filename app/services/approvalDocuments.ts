import type {
    ApprovalDocument,
    ApprovalWorkflowRequest,
    ApproveDocumentRequest,
    RejectDocumentRequest
} from '~/models/approval-document'
import type { PaginatedResponse } from '~/models/pagination'
import type { PaginationMeta } from '~/models/pagination'

export async function fetchApprovalDocuments(
    params: { page: number; pageSize: number; search?: string },
    headers: Record<string, string>,
) {

    return $fetch<PaginatedResponse<ApprovalDocument>>('/api/approval-documents', {
        method: 'GET',
        headers,
        query: params,
    })
}

export async function fetchPendingApprovals(
    params: { page: number; pageSize: number; search?: string },
    headers: Record<string, string>,
) {

    return $fetch<PaginatedResponse<ApprovalDocument>>('/api/approval-documents/pending', {
        method: 'GET',
        headers,
        query: params,
    })
}

export async function fetchAllRelatedDocuments(
    params: { page: number; pageSize: number; search?: string },
    headers: Record<string, string>,
) {
    return $fetch<PaginatedResponse<ApprovalDocument>>('/api/approval-documents/all', {
        method: 'GET',
        headers,
        query: params,
    })
}

export async function fetchApprovalDocument(id: number, headers: Record<string, string>,) {
    return $fetch<ApprovalDocument | null>(`/api/approval-documents/${id}`, {
        method: 'GET',
        headers,
    });
}

export async function createApprovalDocument(
    data: FormData,
    headers: Record<string, string>,
) {
   
    return $fetch('/api/approval-documents', {
        method: 'POST',
        headers,
        body: data,
    })
}

export async function submitApprovalDocument(id: number, headers: Record<string, string>) {
    return $fetch(`/api/approval-documents/${id}/submit`, {
        method: 'POST',
        headers,
    })
}

export async function approveDocument(
    id: number,
    data: FormData,
    headers: Record<string, string>
) {
    return $fetch<{
      success: boolean,
      message: string,
      next_level: number,
      final_status: string
    }>(`/api/approval-documents/${id}/approve`, {
        method: 'POST',
        headers,
        body: data,
    })
}

export async function rejectDocument(
    id: number,
    data: RejectDocumentRequest,
    headers: Record<string, string>
) {
    return $fetch<{
      success: boolean,
      message: string
    }>(`/api/approval-documents/${id}/reject`, {
        method: 'POST',
        headers,
        body: data,
    })
}

export async function createDocumentRevision(
    id: number,
    data: FormData,
    headers: Record<string, string>,
) {
    return $fetch<{
      success: boolean
      message: string
      document_id: number
      revision_number: number
    }>(`/api/approval-documents/${id}/revisions`, {
        method: 'POST',
        headers,
        body: data,
    })
}

export async function fetchAvailableUsers(headers: Record<string, string>) {
    return $fetch<{
        data: Array<{
            id: number
            fullname: string
            email: string
            phone: string
            role: string
        }>
    }>('/api/approval-documents/users', {
        method: 'GET',
        headers,
    })
}

export async function fetchAvailableRoles(headers: Record<string, string>) {
    return $fetch<{
        data: Array<{
            id: number
            name: string
        }>
    }>('/api/approval-documents/roles', {
        method: 'GET',
        headers,
    })
}

export async function fetchRoleUsers(roleId: number, headers: Record<string, string>) {
    return $fetch<{
        data: Array<{
            id: number
            fullname: string
            email: string
            phone_number: string
        }>
    }>('/api/approval-documents/role-users', {
        method: 'GET',
        headers,
        query: { role_id: roleId },
    })
}

export async function fetchDocumentReport(
    params: {
        start_date: string
        end_date: string
        status?: string
        search?: string
    },
    headers: Record<string, string>,
) {
    return $fetch<{
        ok: boolean
        data: ApprovalDocument[]
        summary: {
            total: number
            draft: number
            pending: number
            approved: number
            rejected: number
        }
    }>('/api/approval-documents/report', {
        method: 'GET',
        headers,
        query: params,
    })
}
