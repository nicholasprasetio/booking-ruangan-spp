<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Manajemen Pengguna', 'User Management') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Kelola akun user, role, dan reset password.', 'Manage user accounts, roles, and password reset.') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="relative">
              <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="search"
                type="text"
                :placeholder="tr('Cari nama / username / email / no HP...', 'Search name / username / email / phone...')"
                class="pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              />
            </div>
            <button
              class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm"
              :disabled="loading"
              @click="refresh"
            >
              {{ tr('Perbarui', 'Refresh') }}
            </button>
            <button
              class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm inline-flex items-center gap-1"
              @click="openCreateModal"
            >
              <Icon name="mdi:account-plus" size="18" />
              {{ tr('Tambah User', 'Add User') }}
            </button>
          </div>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
          {{ error }}
        </div>

        <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
          {{ tr('Memuat data pengguna...', 'Loading users...') }}
        </div>

        <div v-else class="space-y-4">
          <div v-if="users.length === 0" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
            {{ tr('Tidak ada data pengguna.', 'No user data found.') }}
          </div>

          <div
            v-for="user in users"
            :key="user.id"
            class="bg-white rounded-3xl shadow-xl p-6 border border-gray-100"
          >
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-3">
                  <div class="text-xl font-bold text-gray-900">
                    {{ user.fullname || '-' }}
                  </div>
                  <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="roleBadgeClass(user.role_name)">
                    {{ roleLabel(user.role_name) }}
                  </span>
                  <span
                    v-for="rn in (user.role_names || []).slice(1)"
                    :key="rn"
                    class="px-3 py-1 rounded-full text-xs font-semibold"
                    :class="roleBadgeClass(rn)"
                  >
                    {{ roleLabel(rn) }}
                  </span>
                  <span
                    v-if="user.id === currentUserId"
                    class="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600"
                  >
                    {{ tr('Akun Anda', 'Your Account') }}
                  </span>
                </div>

                <div class="text-sm text-gray-700 space-y-1">
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:phone-outline" class="text-gray-400" />
                    <span>{{ user.phone_number || '-' }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:account-circle-outline" class="text-gray-400" />
                    <span>{{ user.username || '-' }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:email-outline" class="text-gray-400" />
                    <span>{{ user.email || '-' }}</span>
                  </div>
                </div>

                <div class="text-xs text-gray-500">
                  ID: {{ user.id }} · {{ tr('Terdaftar', 'Registered') }} {{ formatDate(user.created_at) }}
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button
                  v-if="user.id !== currentUserId"
                  @click="openRoleModal(user)"
                  class="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition inline-flex items-center gap-1"
                >
                  <Icon name="mdi:shield-account" size="16" />
                  {{ tr('Atur Role', 'Manage Roles') }}
                </button>
                <button
                  v-if="user.id !== currentUserId"
                  class="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition shadow-sm"
                  @click="resetPassword(user)"
                >
                  {{ tr('Reset Password', 'Reset Password') }}
                </button>
                <button
                  v-if="user.id !== currentUserId"
                  class="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow-sm"
                  :disabled="user.id === currentUserId"
                  @click="confirmDelete(user)"
                >
                  {{ tr('Hapus', 'Delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <Pagination :meta="meta" @change="onPageChange" />
        </div>
      </div>
    </div>

    <!-- Role Modal -->
    <Teleport to="body">
      <div v-if="showRoleModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="showRoleModal = false">
        <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl">
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-3xl">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ tr('Atur Role', 'Manage Roles') }}</h2>
              <p class="text-sm text-gray-500">{{ editingUser?.fullname || '-' }}</p>
            </div>
            <button @click="showRoleModal = false" class="text-gray-500 hover:text-gray-700">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>
          <div class="p-6 space-y-2">
            <label
              v-for="role in roleOptions"
              :key="role.value"
              class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
              :class="selectedRoleNames.has(role.value) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'"
            >
              <input
                type="checkbox"
                :checked="selectedRoleNames.has(role.value)"
                @change="toggleRole(role.value)"
                class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span class="font-medium text-gray-900">{{ roleLabel(role.value) }}</span>
            </label>
            <p class="text-xs text-gray-500 mt-2">{{ tr('User harus memiliki minimal 1 role.', 'User must have at least 1 role.') }}</p>
          </div>
          <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              @click="showRoleModal = false"
              class="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
            >
              {{ tr('Batal', 'Cancel') }}
            </button>
            <button
              @click="saveRoles"
              :disabled="savingRoles || selectedRoleNames.size === 0"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {{ savingRoles ? tr('Menyimpan...', 'Saving...') : tr('Simpan', 'Save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create User Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="closeCreateModal">
        <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl">
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-3xl">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ tr('Tambah User', 'Add User') }}</h2>
              <p class="text-sm text-gray-500">{{ tr('User dibuat oleh admin.', 'User is created by an admin.') }}</p>
            </div>
            <button @click="closeCreateModal" class="text-gray-500 hover:text-gray-700">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <form class="p-6 space-y-4" @submit.prevent="createUser">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nama Lengkap', 'Full Name') }}</label>
              <input v-model.trim="newUser.fullname" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nomor Telepon', 'Phone Number') }}</label>
                <input v-model.trim="newUser.phoneNumber" type="tel" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="62812xxxx" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input v-model.trim="newUser.email" type="email" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <input v-model.trim="newUser.username" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="username" />
              <p class="text-xs text-gray-500 mt-1">{{ tr('Isi minimal salah satu: nomor telepon, email, atau username.', 'Fill at least one: phone, email, or username.') }}</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input v-model="newUser.password" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Role</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="role in roleOptions"
                  :key="role.value"
                  class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
                  :class="newUser.roles.includes(role.value) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'"
                >
                  <input v-model="newUser.roles" type="checkbox" :value="role.value" class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                  <span class="font-medium text-gray-900">{{ roleLabel(role.value) }}</span>
                </label>
              </div>
            </div>
            <div class="pt-2 flex justify-end gap-3">
              <button type="button" @click="closeCreateModal" class="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition">
                {{ tr('Batal', 'Cancel') }}
              </button>
              <button type="submit" :disabled="creatingUser" class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                {{ creatingUser ? tr('Menyimpan...', 'Saving...') : tr('Simpan', 'Save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import type { PaginationMeta } from '~/models/pagination'
import type { AdminUserRow } from '~/models/user'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  fetchCurrentUser,
  resetAdminUserPassword,
  updateAdminUserRole,
} from '~/services/adminUsers'

const { tr, localeTag } = useAppLocale()
const auth = useAuth()
auth.loadFromStorage()

const loading = ref(false)
const error = ref<string | null>(null)
const users = ref<AdminUserRow[]>([])
const currentUserId = ref<number | null>(null)

const search = ref('')
const page = ref(1)
const pageSize = 10
const meta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })
const roleOptions = ref<Array<{ value: string; label: string; id: number }>>([
  { value: 'admin', label: 'Admin', id: 1 },
  { value: 'user', label: tr('Pengguna', 'User'), id: 2 },
])

// Role modal state
const showRoleModal = ref(false)
const editingUser = ref<AdminUserRow | null>(null)
const selectedRoleNames = ref<Set<string>>(new Set())
const savingRoles = ref(false)
const showCreateModal = ref(false)
const creatingUser = ref(false)
const newUser = ref({
  fullname: '',
  phoneNumber: '',
  email: '',
  username: '',
  password: '',
  roles: ['user'] as string[],
})

function roleBadgeClass(role: string | null) {
  if (role === 'admin') return 'bg-indigo-50 text-indigo-700'
  if (role === 'user') return 'bg-slate-100 text-slate-700'
  return 'bg-purple-50 text-purple-700'
}

function roleLabel(role: string | null) {
  const normalized = (role || 'user').toLowerCase()
  if (normalized === 'admin') return tr('Admin', 'Admin')
  if (normalized === 'user') return tr('Pengguna', 'User')
  const hit = roleOptions.value.find((item) => item.value === normalized)
  return hit ? hit.label : normalized
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString(localeTag.value, { year: 'numeric', month: 'short', day: '2-digit' })
}

async function loadCurrentUser() {
  try {
    const res = await fetchCurrentUser(auth.authHeaders())
    currentUserId.value = res.user?.id ?? null
  } catch {
    currentUserId.value = null
  }
}

async function loadRoles() {
  try {
    const res = await $fetch<{ ok: boolean; data: Array<{ id: number; name: string }> }>('/api/admin/roles', {
      headers: auth.authHeaders(),
    })
    if (res.data?.length) {
      roleOptions.value = res.data.map(r => ({
        id: r.id,
        value: r.name.toLowerCase(),
        label: r.name.charAt(0).toUpperCase() + r.name.slice(1),
      }))
    }
  } catch {
    // Keep defaults
  }
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchAdminUsers(
      { page: page.value, pageSize, search: search.value.trim() || undefined },
      auth.authHeaders(),
    )
    users.value = res.data || []
    meta.value = res.meta
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat data pengguna.', 'Failed to load users.')
  } finally {
    loading.value = false
  }
}

function onPageChange(nextPage: number) {
  page.value = nextPage
  refresh()
}

async function openRoleModal(user: AdminUserRow) {
  editingUser.value = user
  selectedRoleNames.value = new Set(user.role_names || [user.role_name || 'user'].map(r => r.toLowerCase()))
  showRoleModal.value = true
}

function toggleRole(roleName: string) {
  const s = new Set(selectedRoleNames.value)
  if (s.has(roleName)) {
    if (s.size <= 1) return // Must have at least 1 role
    s.delete(roleName)
  } else {
    s.add(roleName)
  }
  selectedRoleNames.value = s
}

async function saveRoles() {
  if (!editingUser.value) return
  const roles = [...selectedRoleNames.value]
  if (roles.length === 0) return
  savingRoles.value = true
  try {
    await updateAdminUserRole(editingUser.value.id, { roles }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Role diperbarui', 'Roles updated'), timer: 1200, showConfirmButton: false })
    showRoleModal.value = false
    editingUser.value = null
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal mengubah role.', 'Failed to update roles.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    savingRoles.value = false
  }
}

function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

function openCreateModal() {
  newUser.value = {
    fullname: '',
    phoneNumber: '',
    email: '',
    username: '',
    password: generatePassword(),
    roles: ['user'],
  }
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function createUser() {
  if (!newUser.value.fullname || !newUser.value.password || !newUser.value.roles.length) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Nama, password, dan role wajib diisi.', 'Name, password, and role are required.') })
    return
  }
  if (!newUser.value.phoneNumber && !newUser.value.email && !newUser.value.username) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Isi minimal salah satu: nomor telepon, email, atau username.', 'Fill at least one: phone, email, or username.') })
    return
  }

  creatingUser.value = true
  try {
    await createAdminUser(
      {
        fullname: newUser.value.fullname,
        phoneNumber: newUser.value.phoneNumber || null,
        email: newUser.value.email || null,
        username: newUser.value.username || null,
        password: newUser.value.password,
        roles: newUser.value.roles,
      },
      auth.authHeaders(),
    )
    await Swal.fire({ icon: 'success', title: tr('User dibuat', 'User created'), timer: 1200, showConfirmButton: false })
    showCreateModal.value = false
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal membuat user.', 'Failed to create user.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    creatingUser.value = false
  }
}

async function resetPassword(user: AdminUserRow) {
  const defaultPassword = generatePassword()
  const result = await Swal.fire({
    title: tr('Reset Password', 'Reset Password'),
    input: 'text',
    inputValue: defaultPassword,
    inputLabel: tr(`Password baru untuk ${user.fullname || user.username || user.phone_number}`, `New password for ${user.fullname || user.username || user.phone_number}`),
    inputPlaceholder: tr('Masukkan password baru', 'Enter new password'),
    showCancelButton: true,
    confirmButtonText: tr('Reset', 'Reset'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#f59e0b',
    preConfirm: (value) => {
      if (!value || String(value).trim().length < 6) {
        Swal.showValidationMessage(tr('Password minimal 6 karakter', 'Password must be at least 6 characters'))
      }
      return value
    },
  })

  if (!result.isConfirmed || !result.value) return

  try {
    await resetAdminUserPassword(user.id, { password: String(result.value).trim() }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Password direset', 'Password reset'), timer: 1200, showConfirmButton: false })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal reset password.', 'Failed to reset password.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  }
}

async function confirmDelete(user: AdminUserRow) {
  const result = await Swal.fire({
    title: tr('Hapus User?', 'Delete User?'),
    text: tr(`Hapus akun ${user.fullname || user.username || user.phone_number}?`, `Delete account ${user.fullname || user.username || user.phone_number}?`),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonText: tr('Ya, Hapus', 'Yes, Delete'),
  })

  if (!result.isConfirmed) return

  try {
    await deleteAdminUser(user.id, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('User dihapus', 'User deleted'), timer: 1200, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menghapus user.', 'Failed to delete user.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  }
}

watch(search, () => {
  page.value = 1
  refresh()
})

onMounted(async () => {
  await loadCurrentUser()
  await loadRoles()
  await refresh()
})
</script>

