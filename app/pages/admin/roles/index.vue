<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="max-w-5xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Manajemen Role', 'Role Management') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Kelola role dan atur permission per role.', 'Manage roles and configure permissions per role.') }}</p>
          </div>
          <button
            @click="openCreateModal"
            class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm inline-flex items-center gap-2"
          >
            <Icon name="mdi:plus" />
            {{ tr('Tambah Role', 'Add Role') }}
          </button>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
          {{ error }}
        </div>

        <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
          {{ tr('Memuat data role...', 'Loading roles...') }}
        </div>

        <div v-else class="space-y-4">
          <div v-if="roles.length === 0" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
            {{ tr('Tidak ada role.', 'No roles found.') }}
          </div>

          <div
            v-for="role in roles"
            :key="role.id"
            class="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div class="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div class="flex items-center gap-3">
                  <h3 class="text-xl font-bold text-gray-900 capitalize">{{ role.name }}</h3>
                  <span v-if="role.name === 'admin' || role.name === 'user'"
                    class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {{ tr('Bawaan', 'Built-in') }}
                  </span>
                </div>
                <p class="text-sm text-gray-500 mt-1">{{ role.user_count }} {{ tr('pengguna', 'users') }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="openPermissionModal(role)"
                  class="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition inline-flex items-center gap-1"
                >
                  <Icon name="mdi:shield-key" size="16" />
                  {{ tr('Atur Permission', 'Manage Permissions') }}
                </button>
                <button
                  @click="openEditModal(role)"
                  class="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition"
                >
                  {{ tr('Edit', 'Edit') }}
                </button>
                <button
                  v-if="role.name !== 'admin' && role.name !== 'user'"
                  @click="confirmDelete(role)"
                  class="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
                >
                  {{ tr('Hapus', 'Delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Role Modal -->
    <Teleport to="body">
      <div v-if="showRoleModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="closeRoleModal">
        <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl">
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
            <h2 class="text-xl font-bold text-gray-900">{{ editingRole ? tr('Edit Role', 'Edit Role') : tr('Tambah Role', 'Add Role') }}</h2>
            <button @click="closeRoleModal" class="text-gray-500 hover:text-gray-700">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>
          <form @submit.prevent="saveRole" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nama Role', 'Role Name') }}</label>
              <input
                v-model="roleForm.name"
                type="text"
                required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                :placeholder="tr('Masukkan nama role', 'Enter role name')"
              />
            </div>
            <div class="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                @click="closeRoleModal"
                class="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
              >
                {{ tr('Batal', 'Cancel') }}
              </button>
              <button
                type="submit"
                :disabled="savingRole"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {{ savingRole ? tr('Menyimpan...', 'Saving...') : tr('Simpan', 'Save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Permission Modal -->
    <Teleport to="body">
      <div v-if="showPermModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="closePermModal">
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl z-10">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ tr('Permission untuk Role:', 'Permissions for Role:') }} <span class="capitalize text-indigo-700">{{ permRole?.name }}</span></h2>
              <p class="text-sm text-gray-500 mt-1">{{ tr('Centang permission yang diizinkan untuk role ini.', 'Select permissions allowed for this role.') }}</p>
            </div>
            <button @click="closePermModal" class="text-gray-500 hover:text-gray-700">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div v-if="loadingPerms" class="p-10 text-center text-gray-600">{{ tr('Memuat permission...', 'Loading permissions...') }}</div>

          <div v-else class="p-6 space-y-4">
            <div v-for="(group, category) in groupedRolePerms" :key="category">
              <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{{ category || tr('Lainnya', 'Others') }}</h4>
              <div class="space-y-2">
                <label
                  v-for="perm in group"
                  :key="perm.id"
                  class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    :checked="selectedPermIds.has(perm.id)"
                    @change="togglePerm(perm.id)"
                    class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-gray-900">{{ perm.name }}</div>
                    <div class="text-xs text-gray-500">
                      {{ perm.code }}
                      <span v-if="perm.default_granted" class="ml-1 text-green-600 font-medium">• {{ tr('Default', 'Default') }}</span>
                    </div>
                    <div v-if="perm.description" class="text-xs text-gray-400 mt-0.5">{{ perm.description }}</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                @click="closePermModal"
                class="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
              >
                {{ tr('Batal', 'Cancel') }}
              </button>
              <button
                @click="savePermissions"
                :disabled="savingPerms"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {{ savingPerms ? tr('Menyimpan...', 'Saving...') : tr('Simpan Permission', 'Save Permissions') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import type { Role, RolePermission } from '~/services/adminRolesPermissions'
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchRolePermissions,
  updateRolePermissions,
} from '~/services/adminRolesPermissions'

const { tr } = useAppLocale()
const auth = useAuth()
auth.loadFromStorage()

const loading = ref(false)
const error = ref<string | null>(null)
const roles = ref<Role[]>([])

// Role modal
const showRoleModal = ref(false)
const savingRole = ref(false)
const editingRole = ref<Role | null>(null)
const roleForm = ref({ name: '' })

// Permission modal
const showPermModal = ref(false)
const loadingPerms = ref(false)
const savingPerms = ref(false)
const permRole = ref<Role | null>(null)
const rolePerms = ref<RolePermission[]>([])
const selectedPermIds = ref<Set<number>>(new Set())

const groupedRolePerms = computed(() => {
  const groups: Record<string, RolePermission[]> = {}
  for (const p of rolePerms.value) {
    const cat = p.category || tr('Lainnya', 'Others')
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(p)
  }
  return groups
})

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchRoles(auth.authHeaders())
    roles.value = res.data || []
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat role.', 'Failed to load roles.')
  } finally {
    loading.value = false
  }
}

// Role CRUD
function openCreateModal() {
  editingRole.value = null
  roleForm.value = { name: '' }
  showRoleModal.value = true
}

function openEditModal(role: Role) {
  editingRole.value = role
  roleForm.value = { name: role.name }
  showRoleModal.value = true
}

function closeRoleModal() {
  showRoleModal.value = false
  editingRole.value = null
}

async function saveRole() {
  if (!roleForm.value.name) return
  savingRole.value = true
  try {
    if (editingRole.value) {
      await updateRole(editingRole.value.id, { name: roleForm.value.name }, auth.authHeaders())
    } else {
      await createRole({ name: roleForm.value.name }, auth.authHeaders())
    }
    await Swal.fire({ icon: 'success', title: tr('Berhasil', 'Success'), timer: 1200, showConfirmButton: false })
    closeRoleModal()
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menyimpan role.', 'Failed to save role.') })
  } finally {
    savingRole.value = false
  }
}

async function confirmDelete(role: Role) {
  const result = await Swal.fire({
    title: tr('Hapus Role?', 'Delete Role?'),
    text: tr(`Hapus role "${role.name}"?`, `Delete role "${role.name}"?`),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonText: tr('Ya, Hapus', 'Yes, Delete'),
  })
  if (!result.isConfirmed) return

  try {
    await deleteRole(role.id, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Role dihapus', 'Role deleted'), timer: 1200, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menghapus role.', 'Failed to delete role.') })
  }
}

// Permission management
async function openPermissionModal(role: Role) {
  permRole.value = role
  showPermModal.value = true
  loadingPerms.value = true
  try {
    const res = await fetchRolePermissions(role.id, auth.authHeaders())
    rolePerms.value = res.data || []
    selectedPermIds.value = new Set(
      rolePerms.value.filter(p => p.granted).map(p => p.id)
    )
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Gagal memuat permission.', 'Failed to load permissions.') })
    showPermModal.value = false
  } finally {
    loadingPerms.value = false
  }
}

function closePermModal() {
  showPermModal.value = false
  permRole.value = null
  rolePerms.value = []
}

function togglePerm(permId: number) {
  const s = new Set(selectedPermIds.value)
  if (s.has(permId)) {
    s.delete(permId)
  } else {
    s.add(permId)
  }
  selectedPermIds.value = s
}

async function savePermissions() {
  if (!permRole.value) return
  savingPerms.value = true
  try {
    await updateRolePermissions(permRole.value.id, [...selectedPermIds.value], auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Permission disimpan', 'Permissions saved'), timer: 1200, showConfirmButton: false })
    closePermModal()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menyimpan permission.', 'Failed to save permissions.') })
  } finally {
    savingPerms.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>
