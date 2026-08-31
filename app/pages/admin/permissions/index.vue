<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="max-w-5xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Manajemen Permission', 'Permission Management') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Kelola permission yang tersedia di sistem.', 'Manage available permissions in the system.') }}</p>
          </div>
          <button
            @click="openCreateModal"
            class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm inline-flex items-center gap-2"
          >
            <Icon name="mdi:plus" />
            {{ tr('Tambah Permission', 'Add Permission') }}
          </button>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
          {{ error }}
        </div>

        <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
          {{ tr('Memuat data permission...', 'Loading permissions...') }}
        </div>

        <div v-else class="space-y-4">
          <div v-if="permissions.length === 0" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
            {{ tr('Tidak ada permission.', 'No permissions found.') }}
          </div>

          <!-- Group by category -->
          <div v-for="(group, category) in groupedPermissions" :key="category" class="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-800">{{ category || tr('Lainnya', 'Others') }}</h3>
            </div>
            <div class="divide-y divide-gray-100">
              <div
                v-for="perm in group"
                :key="perm.id"
                class="px-6 py-4 flex items-center justify-between gap-4"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <code class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">{{ perm.code }}</code>
                    <span class="font-medium text-gray-900">{{ perm.name }}</span>
                    <span v-if="perm.default_granted" class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{{ tr('Default', 'Default') }}</span>
                  </div>
                  <p v-if="perm.description" class="text-sm text-gray-500 mt-1">{{ perm.description }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="openEditModal(perm)"
                    class="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition"
                  >
                    {{ tr('Edit', 'Edit') }}
                  </button>
                  <button
                    @click="confirmDelete(perm)"
                    class="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
                  >
                    {{ tr('Hapus', 'Delete') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="closeModal">
        <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl">
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl">
            <h2 class="text-xl font-bold text-gray-900">{{ editingPermission ? tr('Edit Permission', 'Edit Permission') : tr('Tambah Permission', 'Add Permission') }}</h2>
            <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>
          <form @submit.prevent="savePermission" class="p-6 space-y-4">
            <div v-if="!editingPermission">
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Kode', 'Code') }}</label>
              <input
                v-model="form.code"
                type="text"
                required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                :placeholder="tr('menu.nama_fitur', 'menu.feature_name')"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nama', 'Name') }}</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                :placeholder="tr('Nama permission', 'Permission name')"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Deskripsi', 'Description') }}</label>
              <textarea
                v-model="form.description"
                rows="2"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                :placeholder="tr('Deskripsi permission', 'Permission description')"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Kategori', 'Category') }}</label>
              <input
                v-model="form.category"
                type="text"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                :placeholder="tr('Menu / Admin / Lainnya', 'Menu / Admin / Others')"
              />
            </div>
            <div>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="form.default_granted"
                  type="checkbox"
                  class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div>
                  <span class="text-sm font-semibold text-gray-700">{{ tr('Default Aktif', 'Default Enabled') }}</span>
                  <p class="text-xs text-gray-500">{{ tr('Otomatis aktif saat membuat role baru', 'Automatically enabled when creating a new role') }}</p>
                </div>
              </label>
            </div>
            <div class="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                @click="closeModal"
                class="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
              >
                {{ tr('Batal', 'Cancel') }}
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {{ saving ? tr('Menyimpan...', 'Saving...') : tr('Simpan', 'Save') }}
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
import type { Permission } from '~/services/adminRolesPermissions'
import {
  fetchPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} from '~/services/adminRolesPermissions'

const { tr } = useAppLocale()
const auth = useAuth()
auth.loadFromStorage()

const loading = ref(false)
const error = ref<string | null>(null)
const permissions = ref<Permission[]>([])
const showModal = ref(false)
const saving = ref(false)
const editingPermission = ref<Permission | null>(null)
const form = ref({ code: '', name: '', description: '', category: '', default_granted: false })

const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}
  for (const p of permissions.value) {
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
    const res = await fetchPermissions(auth.authHeaders())
    permissions.value = res.data || []
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat permission.', 'Failed to load permissions.')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingPermission.value = null
  form.value = { code: '', name: '', description: '', category: '', default_granted: false }
  showModal.value = true
}

function openEditModal(perm: Permission) {
  editingPermission.value = perm
  form.value = {
    code: perm.code,
    name: perm.name,
    description: perm.description || '',
    category: perm.category || '',
    default_granted: !!perm.default_granted,
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingPermission.value = null
}

async function savePermission() {
  if (!form.value.name) return
  saving.value = true
  try {
    if (editingPermission.value) {
      await updatePermission(editingPermission.value.id, {
        name: form.value.name,
        description: form.value.description,
        category: form.value.category,
        default_granted: form.value.default_granted,
      }, auth.authHeaders())
    } else {
      if (!form.value.code) return
      await createPermission({
        code: form.value.code,
        name: form.value.name,
        description: form.value.description,
        category: form.value.category,
        default_granted: form.value.default_granted,
      }, auth.authHeaders())
    }
    await Swal.fire({ icon: 'success', title: tr('Berhasil', 'Success'), timer: 1200, showConfirmButton: false })
    closeModal()
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menyimpan permission.', 'Failed to save permission.') })
  } finally {
    saving.value = false
  }
}

async function confirmDelete(perm: Permission) {
  const result = await Swal.fire({
    title: tr('Hapus Permission?', 'Delete Permission?'),
    text: tr(`Hapus permission "${perm.name}" (${perm.code})?`, `Delete permission "${perm.name}" (${perm.code})?`),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonText: tr('Ya, Hapus', 'Yes, Delete'),
  })
  if (!result.isConfirmed) return

  try {
    await deletePermission(perm.id, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Permission dihapus', 'Permission deleted'), timer: 1200, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal menghapus permission.', 'Failed to delete permission.') })
  }
}

onMounted(() => {
  refresh()
})
</script>
