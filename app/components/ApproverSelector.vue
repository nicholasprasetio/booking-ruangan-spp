<template>
  <div class="approver-selector space-y-4">
    <div>
      <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ tr('Pilih Approver Bertingkat', 'Choose Multi-Level Approvers') }}</h3>
      <p class="text-sm text-gray-600">{{ tr('Tambahkan level, lalu tambahkan approver (user tertentu atau berdasarkan role).', 'Add levels, then add approvers (specific users or by role).') }}</p>
    </div>

    <!-- Global mode selector (only if no approvers added yet) -->
    <!-- <div v-if="!isModeLocked" class="flex gap-3 items-center">
      <span class="text-sm font-medium text-gray-700">{{ tr('Mode Approver:', 'Approver Mode:') }}</span>
      <button
        type="button"
        @click="globalMode = 'user'"
        class="px-4 py-2 rounded-lg text-sm font-semibold border transition"
        :class="globalMode === 'user' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'"
      >
        <Icon name="mdi:account" size="16" class="mr-1" />
        {{ tr('Pengguna', 'User') }}
      </button>
      <button
        type="button"
        @click="globalMode = 'role'"
        class="px-4 py-2 rounded-lg text-sm font-semibold border transition"
        :class="globalMode === 'role' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-300'"
      >
        <Icon name="mdi:shield-account" size="16" class="mr-1" />
        {{ tr('Role', 'Role') }}
      </button>
    </div> -->

    <!-- Locked mode indicator -->
    <!-- <div v-else class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
      :class="globalMode === 'role' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'"
    >
      <Icon :name="globalMode === 'role' ? 'mdi:shield-account' : 'mdi:account'" size="18" />
      {{ tr('Mode', 'Mode') }}: <strong class="capitalize">{{ globalMode === 'role' ? tr('Role', 'Role') : tr('Pengguna', 'User') }}</strong>
    </div> -->

    <!-- Levels -->
    <div v-if="levels.length > 0" class="space-y-4">
      <div
        v-for="level in levels"
        :key="level"
        class="border border-gray-200 rounded-2xl bg-gray-50"
      >
        <!-- Level header -->
        <div class="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200">
          <h5 class="font-semibold text-indigo-700 flex items-center gap-2">
            <Icon name="mdi:layers" size="18" />
            {{ tr('Level', 'Level') }} {{ level }}
          </h5>
          <button
            type="button"
            @click="removeLevel(level)"
            class="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1 transition"
          >
            <Icon name="mdi:delete-outline" size="16" />
            {{ tr('Hapus Level', 'Remove Level') }}
          </button>
        </div>

        <div class="p-4 space-y-3">
          <!-- Approvers list -->
          <div v-if="getApproversAtLevel(level).length > 0" class="space-y-2">
            <div
              v-for="approver in getApproversAtLevel(level)"
              :key="approverKey(approver)"
              class="bg-white rounded-xl border border-gray-100"
            >
              <div class="flex items-center justify-between p-3">
                <div class="flex items-center gap-3 flex-1">
                  <!-- Role-based approver -->
                  <template v-if="approver.approver_role_id">
                    <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                      <Icon name="mdi:shield-account" size="18" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 truncate">
                        {{ tr('Role', 'Role') }}: {{ getRoleName(approver.approver_role_id) }}
                      </div>
                      <div class="text-sm text-purple-600 truncate">{{ tr('Semua user dengan role ini bisa tanda tangan', 'All users with this role can sign') }}</div>
                    </div>
                  </template>
                  <!-- User-based approver -->
                  <template v-else>
                    <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                      {{ getUserInitials(approver.approver_id) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 truncate">{{ getUserName(approver.approver_id) }}</div>
                      <div class="text-sm text-gray-500 truncate">{{ getUserEmail(approver.approver_id) }}</div>
                    </div>
                  </template>
                </div>

                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-2" v-if="globalMode === 'user'">
                    <span class="text-xs font-medium text-gray-600">
                      {{ approver.is_required ? tr('Wajib', 'Required') : tr('Opsional', 'Optional') }}
                    </span>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        :checked="approver.is_required"
                        @change="toggleRequired(approverKey(approver))"
                        class="sr-only peer"
                      />
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <button
                    type="button"
                    @click="removeApprover(approverKey(approver))"
                    class="text-red-500 hover:text-red-700 transition p-1"
                  >
                    <Icon name="mdi:close-circle" size="18" />
                  </button>
                </div>
              </div>

              <!-- Role users list (when role mode) -->
              <div
                v-if="approver.approver_role_id && roleUsersMap[approver.approver_role_id]"
                class="border-t border-gray-100 px-3 py-2"
              >
                <div class="text-xs font-semibold text-gray-500 uppercase mb-2">{{ tr('Pengguna dalam role ini:', 'Users in this role:') }}</div>
                <div v-if="roleUsersLoading[approver.approver_role_id]" class="text-xs text-gray-400 py-1">{{ tr('Memuat...', 'Loading...') }}</div>
                <div v-else-if="(roleUsersMap[approver.approver_role_id] || []).length === 0" class="text-xs text-gray-400 py-1">{{ tr('Tidak ada user dalam role ini.', 'No users in this role.') }}</div>
                <div v-else class="space-y-1.5">
                  <div
                    v-for="ru in roleUsersMap[approver.approver_role_id]"
                    :key="ru.id"
                    class="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-50"
                  >
                    <div class="flex items-center gap-2 text-sm">
                      <div class="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold">
                        {{ (ru.fullname || '?').charAt(0).toUpperCase() }}
                      </div>
                      <span class="text-gray-800">{{ ru.fullname || '-' }}</span>
                      <span class="text-gray-400 text-xs">{{ ru.email || '' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-4 text-gray-400 text-sm">
            {{ tr('Belum ada approver di level ini.', 'No approvers at this level yet.') }}
          </div>

          <!-- Add approver dropdown -->
          <div class="space-y-2" v-if="globalMode === 'user' || (globalMode === 'role' && !levelHasRole(level))">
            <!-- User mode -->
            <div v-if="globalMode === 'user'" class="relative">
              <button
                type="button"
                @click="openUserPicker(level)"
                :disabled="getAvailableUsersForLevel(level).length === 0"
                class="w-full px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Icon name="mdi:plus" size="16" />
                {{ tr('Tambah Approver', 'Add Approver') }}
              </button>

              <div
                v-if="activeUserPickerLevel === level"
                class="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
              >
                <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <span class="text-xs font-semibold uppercase text-gray-500">{{ tr('Pilih approver', 'Select approver') }}</span>
                  <button
                    type="button"
                    @click="closePickers"
                    class="text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <Icon name="mdi:close" size="16" />
                  </button>
                </div>
                <div v-if="getAvailableUsersForLevel(level).length === 0" class="px-3 py-3 text-sm text-gray-400">
                  {{ tr('Semua user sudah ditambahkan.', 'All users have been added.') }}
                </div>
                <div v-else>
                  <div class="p-2 border-b border-gray-100">
                    <div class="relative">
                      <Icon name="mdi:magnify" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        v-model="levelUserSearch[level]"
                        type="search"
                        :placeholder="tr('Cari nama, email, atau role...', 'Search name, email, or role...')"
                        class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div v-if="getFilteredUsersForLevel(level).length === 0" class="px-3 py-3 text-sm text-gray-400">
                    {{ tr('User tidak ditemukan.', 'No users found.') }}
                  </div>
                  <div v-else class="max-h-56 overflow-y-auto py-1">
                    <button
                      v-for="u in getFilteredUsersForLevel(level)"
                      :key="u.id"
                      type="button"
                      @click="addApproverToLevel(level, u.id)"
                      class="w-full px-3 py-2.5 text-left hover:bg-indigo-50 transition flex items-center gap-3"
                    >
                      <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {{ getUserInitials(u.id) }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-medium text-gray-900 truncate">{{ u.fullname }}</div>
                        <div class="text-xs text-gray-500 truncate">{{ u.email || 'No Email' }}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Role mode -->
            <div v-else class="space-y-2">
              <div v-if="!levelHasRole(level)" class="relative">
                <button
                  type="button"
                  @click="openRolePicker(level)"
                  :disabled="getAvailableRolesForLevel(level).length === 0"
                  class="w-full px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Icon name="mdi:plus" size="16" />
                  {{ tr('Tambah Role', 'Add Role') }}
                </button>

                <div
                  v-if="activeRolePickerLevel === level"
                  class="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                >
                  <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <span class="text-xs font-semibold uppercase text-gray-500">{{ tr('Pilih role', 'Select role') }}</span>
                    <button
                      type="button"
                      @click="closePickers"
                      class="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <Icon name="mdi:close" size="16" />
                    </button>
                  </div>
                  <div v-if="getAvailableRolesForLevel(level).length === 0" class="px-3 py-3 text-sm text-gray-400">
                    {{ tr('Semua role sudah ditambahkan.', 'All roles have been added.') }}
                  </div>
                  <div v-else class="max-h-56 overflow-y-auto py-1">
                    <button
                      v-for="role in getAvailableRolesForLevel(level)"
                      :key="role.id"
                      type="button"
                      @click="addRoleToLevel(level, role.id)"
                      class="w-full px-3 py-2.5 text-left hover:bg-purple-50 transition flex items-center gap-3"
                    >
                      <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Icon name="mdi:shield-account" size="18" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-medium text-gray-900 truncate">{{ role.name }}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Level settings -->
          <div v-if="getApproversAtLevel(level).length > 1 || (globalMode === 'role' && getTotalApproverAtLevel(level) > 1)" class="border-t border-gray-200 pt-3 mt-3">
            <div class="flex items-center gap-3">
              <label class="text-sm font-medium text-gray-700 whitespace-nowrap">{{ tr('Min. Approve', 'Min. Approve') }}:</label>
              <input
                type="number"
                :min="globalMode === 'role' ? 1 : 0"
                :max="getTotalApproverAtLevel(level)"
                :value="getLevelMinApprovals(level)"
                @input="setLevelMinApprovals(level, Number(($event.target as HTMLInputElement).value))"
                class="w-20 px-2 py-1.5 text-sm border rounded-lg text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                :class="isMinApprovalsInvalid(level) ? 'border-red-400 bg-red-50' : 'border-gray-300'"
              />
              <span class="text-xs text-gray-500">{{ tr('dari', 'of') }} {{ getTotalApproverAtLevel(level) }} {{ tr('orang/role', 'people/roles') }}</span>
            </div>
            <p v-if="isMinApprovalsInvalid(level)" class="text-xs text-red-600 mt-1.5 flex items-center gap-1">
              <Icon name="mdi:alert-circle" size="14" />
              {{ tr('Minimal approve tidak boleh lebih dari jumlah approver', 'Minimum approvals cannot exceed number of approvers') }} ({{ getTotalApproverAtLevel(level) }}).
            </p>
            <p v-else class="text-xs text-gray-500 mt-1.5">
              <template v-if="getLevelMinApprovals(level) === 0">
                {{ tr('Semua approver', 'All approvers') }} <strong>{{ tr('wajib', 'must') }}</strong> {{ tr('harus menyetujui.', 'approve.') }}
              </template>
              <template v-else>
                {{ tr('Minimal', 'Minimum') }} <strong>{{ getLevelMinApprovals(level) }}</strong> {{ tr('approver harus approve agar lanjut ke level berikutnya.', 'approvers must approve to continue to the next level.') }}
              </template>
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-2xl bg-gray-50">
      <Icon name="mdi:account-multiple-plus" size="42" class="mb-2 opacity-60" />
      <p>{{ tr('Belum ada level approver. Klik tombol di bawah untuk mulai.', 'No approver levels yet. Click the button below to get started.') }}</p>
    </div>

    <!-- Add level button -->
    <button
      type="button"
      @click="addLevel"
      class="w-full py-3 border-2 border-dashed border-indigo-300 rounded-2xl text-indigo-600 font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition flex items-center justify-center gap-2"
    >
      <Icon name="mdi:plus-circle-outline" size="20" />
      {{ tr('Tambah Level', 'Add Level') }} {{ nextLevel }}
    </button>

    <!-- Summary -->
    <div v-if="modelValue.length > 0" class="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
      <Icon name="mdi:check-circle" size="18" />
      {{ levels.length }} {{ tr('level', 'levels') }}, {{ modelValue.length }} {{ tr('approver ditambahkan. Dokumen siap dibuat.', 'approvers added. Document is ready to create.') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import type { ApprovalWorkflowRequest, LevelSettingsRequest } from '~/models/approval-document'
import { fetchRoleUsers } from '~/services/approvalDocuments'
import { useAppLocale } from '~/composables/useAppLocale'
const { tr } = useAppLocale()

const props = defineProps<{
  modelValue: ApprovalWorkflowRequest[]
  levelSettings: LevelSettingsRequest[]
  availableUsers: Array<{
    id: number
    fullname: string
    email: string
    phone: string
    role: string
  }>
  availableRoles: Array<{
    id: number
    name: string
  }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ApprovalWorkflowRequest[]]
  'update:levelSettings': [value: LevelSettingsRequest[]]
}>()

const auth = useAuth()

// Global mode: 'user' or 'role' — locked after first approver is added
const globalMode = ref<'user' | 'role'>('user')

// Whether mode is locked (at least one approver has been added)
const isModeLocked = computed(() => props.modelValue.length > 0)

// Track which user is selected per level for "add approver"
const levelAddState = ref<Record<number, number | null>>({})
// Track which role is selected per level
const levelAddRoleState = ref<Record<number, number | null>>({})
const activeUserPickerLevel = ref<number | null>(null)
const activeRolePickerLevel = ref<number | null>(null)
const levelUserSearch = ref<Record<number, string>>({})

// Role users cache
const roleUsersMap = ref<Record<number, Array<{ id: number; fullname: string; email: string; phone_number: string }>>>({})
const roleUsersLoading = ref<Record<number, boolean>>({})

// Unique key for an approver entry
function approverKey(a: ApprovalWorkflowRequest): string {
  if (a.approver_role_id) return `role-${a.approver_role_id}-L${a.level}`
  return `user-${a.approver_id}-L${a.level}`
}

// Computed: sorted unique levels
const levels = computed(() => {
  const lvls = new Set(props.modelValue.map((a) => a.level))
  for (const key of Object.keys(levelAddState.value)) {
    lvls.add(Number(key))
  }
  for (const key of Object.keys(levelAddRoleState.value)) {
    lvls.add(Number(key))
  }
  return [...lvls].sort((a, b) => a - b)
})

const nextLevel = computed(() => {
  if (levels.value.length === 0) return 1
  return Math.max(...levels.value) + 1
})

function getApproversAtLevel(level: number): ApprovalWorkflowRequest[] {
  return props.modelValue.filter((a) => a.level === level)
}

function getTotalApproverAtLevel(level: number): number {
  if (globalMode.value === 'role') {
    const roleApprover = props.modelValue.find((a) => a.level === level && a.approver_role_id)
    if (roleApprover) {
      const roleUsers = roleUsersMap.value[roleApprover.approver_role_id || 0] || []
      return roleUsers.length
    }
  } else {
    return props.modelValue.filter((a) => a.level === level && !a.approver_role_id).length
  }
}

function getAvailableUsersForLevel(_level: number): typeof props.availableUsers {
  const usedIds = new Set(
    props.modelValue.filter((a) => !a.approver_role_id).map((a) => a.approver_id),
  )
  return props.availableUsers.filter((u) => !usedIds.has(u.id))
}

function getFilteredUsersForLevel(level: number): typeof props.availableUsers {
  const query = (levelUserSearch.value[level] || '').trim().toLowerCase()
  const users = getAvailableUsersForLevel(level)
  if (!query) return users

  return users.filter((u) => {
    const searchable = [u.fullname, u.email, u.role]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return searchable.includes(query)
  })
}

function getAvailableRolesForLevel(_level: number): typeof props.availableRoles {
  const usedRoleIds = new Set(
    props.modelValue.filter((a) => a.approver_role_id).map((a) => a.approver_role_id),
  )
  return (props.availableRoles || []).filter((r) => !usedRoleIds.has(r.id))
}

function levelHasRole(level: number): boolean {
  return props.modelValue.some((a) => a.approver_role_id && a.level === level)
}

function getRoleName(roleId: number): string {
  return (props.availableRoles || []).find((r) => r.id === roleId)?.name || `Role #${roleId}`
}

function getLevelMinApprovals(level: number): number {
  const setting = props.levelSettings.find((s) => s.level === level)
  return setting?.min_approvals ?? (globalMode.value === 'role' ? 1 : 0)
}

function setLevelMinApprovals(level: number, value: number) {
  const maxAllowed = getTotalApproverAtLevel(level)
  const clamped = Math.max(globalMode.value === 'user' ? 0 : 1, Math.min(value, maxAllowed))
  const updated = props.levelSettings.filter((s) => s.level !== level)
  updated.push({ level, min_approvals: clamped })
  emit('update:levelSettings', updated)
}

function isMinApprovalsInvalid(level: number): boolean {
  const current = getLevelMinApprovals(level)
  const max = getTotalApproverAtLevel(level)
  return current > max
}

function addLevel() {
  const newLvl = nextLevel.value
  levelAddState.value[newLvl] = null
  levelAddRoleState.value[newLvl] = null
  openUserPicker(newLvl)
}

function removeLevel(level: number) {
  const updated = props.modelValue
    .filter((a) => a.level !== level)
    .map((a) => ({ ...a, level: a.level > level ? a.level - 1 : a.level }))
  emit('update:modelValue', updated)

  const updatedSettings = props.levelSettings
    .filter((s) => s.level !== level)
    .map((s) => ({ ...s, level: s.level > level ? s.level - 1 : s.level }))
  emit('update:levelSettings', updatedSettings)

  const newAddState: Record<number, number | null> = {}
  const newAddRoleState: Record<number, number | null> = {}
  const newUserSearch: Record<number, string> = {}
  for (const key of Object.keys(levelAddState.value)) {
    const k = Number(key)
    if (k !== level) newAddState[k > level ? k - 1 : k] = levelAddState.value[k]
  }
  for (const key of Object.keys(levelAddRoleState.value)) {
    const k = Number(key)
    if (k !== level) newAddRoleState[k > level ? k - 1 : k] = levelAddRoleState.value[k]
  }
  for (const key of Object.keys(levelUserSearch.value)) {
    const k = Number(key)
    if (k !== level) newUserSearch[k > level ? k - 1 : k] = levelUserSearch.value[k]
  }
  levelAddState.value = newAddState
  levelAddRoleState.value = newAddRoleState
  levelUserSearch.value = newUserSearch
}

async function loadRoleUsers(roleId: number) {
  if (roleUsersMap.value[roleId] || roleUsersLoading.value[roleId]) return
  roleUsersLoading.value[roleId] = true
  try {
    auth.loadFromStorage()
    const res = await fetchRoleUsers(roleId, auth.authHeaders())
    roleUsersMap.value[roleId] = res.data || []
  } catch {
    roleUsersMap.value[roleId] = []
  } finally {
    roleUsersLoading.value[roleId] = false
  }
}

function openUserPicker(level: number) {
  activeRolePickerLevel.value = null
  activeUserPickerLevel.value = activeUserPickerLevel.value === level ? null : level
  if (activeUserPickerLevel.value === level) {
    levelUserSearch.value[level] = ''
  }
}

function openRolePicker(level: number) {
  activeUserPickerLevel.value = null
  activeRolePickerLevel.value = activeRolePickerLevel.value === level ? null : level
}

function closePickers() {
  activeUserPickerLevel.value = null
  activeRolePickerLevel.value = null
  levelUserSearch.value = {}
}

async function addApproverToLevel(level: number, selectedUserId?: number) {
  const userId = selectedUserId ?? levelAddState.value[level]
  if (!userId) return

  const exists = props.modelValue.find((a) => !a.approver_role_id && a.approver_id === userId)
  if (exists) {
    await Swal.fire({ icon: 'warning', title: tr('Approver sudah ada', 'Approver already exists'), timer: 1000, showConfirmButton: false })
    closePickers()
    return
  }

  const updated = [
    ...props.modelValue,
    {
      level,
      approver_id: userId,
      is_required: true,
      approver_role_id: null,
    },
  ]
  emit('update:modelValue', updated)
  levelAddState.value[level] = null
  levelUserSearch.value[level] = ''
  closePickers()
}

async function addRoleToLevel(level: number, selectedRoleId?: number) {
  const roleId = selectedRoleId ?? levelAddRoleState.value[level]
  if (!roleId) return

  const exists = props.modelValue.find((a) => a.approver_role_id === roleId && a.level === level)
  if (exists) {
    await Swal.fire({ icon: 'warning', title: tr('Role sudah ada di level ini', 'Role already exists at this level'), timer: 1000, showConfirmButton: false })
    closePickers()
    return
  }

  const updated = [
    ...props.modelValue,
    {
      level,
      approver_id: null,
      is_required: true,
      approver_role_id: roleId,
    },
  ]
  emit('update:modelValue', updated)
  levelAddRoleState.value[level] = null
  closePickers()

  // Load users for this role
  loadRoleUsers(roleId)
}

function removeApprover(key: string) {
  const approver = props.modelValue.find((a) => approverKey(a) === key)
  const updated = props.modelValue.filter((a) => approverKey(a) !== key)
  emit('update:modelValue', updated)

  if (approver) {
    const remaining = updated.filter((a) => a.level === approver.level).length
    const currentMin = getLevelMinApprovals(approver.level)
    if (currentMin > remaining) {
      setLevelMinApprovals(approver.level, remaining)
    }
  }
}

function toggleRequired(key: string) {
  const updated = props.modelValue.map((a) =>
    approverKey(a) === key ? { ...a, is_required: !a.is_required } : a,
  )
  emit('update:modelValue', updated)
}

function getUserName(userId: number) {
  return props.availableUsers.find((u) => u.id === userId)?.fullname || tr('Tidak diketahui', 'Unknown')
}

function getUserEmail(userId: number) {
  return props.availableUsers.find((u) => u.id === userId)?.email || ''
}

function getUserInitials(userId: number) {
  const name = getUserName(userId)
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Load role users for already existing role approvers
watch(() => props.modelValue, (val) => {
  for (const a of val) {
    if (a.approver_role_id && !roleUsersMap.value[a.approver_role_id]) {
      loadRoleUsers(a.approver_role_id)
    }
  }
  // Detect mode from existing approvers
  if (val.length > 0) {
    const hasRole = val.some(a => a.approver_role_id)
    globalMode.value = hasRole ? 'role' : 'user'
  }
}, { immediate: true })
</script>
