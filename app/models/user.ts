export type UserRole = 'admin' | 'user' | string

export interface AdminUserRow {
  id: number
  fullname: string | null
  username: string | null
  phone_number: string | null
  email: string | null
  role_name: string | null
  role_names: string[]
  role_ids: number[]
  created_at: string | null
}

export interface CurrentUser {
  id: number
  username?: string | null
  digital_signature_data?: string | null
}
