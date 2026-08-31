<template>
  <aside class="flex w-64 bg-white border-r border-gray-200 h-screen flex-col shadow-lg overflow-hidden">
    <!-- Logo Section -->
    <div class="p-6 border-b border-gray-200">
      <NuxtLink to="/" class="flex items-center space-x-3 hover:opacity-80 transition">
        <img
          src="/logo.png"
          :alt="tr('Logo Paroki Mangga Besar', 'Mangga Besar Parish Logo')"
          class="h-10"
        />
      </NuxtLink>
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      <ClientOnly>
        <template v-for="menu in visibleMenus" :key="menu.path || menu.section || menu.label">
          <!-- Divider -->
          <div v-if="menu.divider" class="pt-4 border-t border-gray-200 mt-4"></div>

          <!-- Section header -->
          <div v-else-if="menu.section" class="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {{ menuText(menu.section) }}
          </div>

          <!-- Collapsible parent menu -->
          <div v-else-if="menu.children">
            <button
              type="button"
              @click="toggleMenu(menu.label)"
              class="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-sky-50 transition group text-left"
              :class="isChildActive(menu) ? 'bg-sky-50' : ''"
            >
              <Icon :name="menu.icon" class="text-xl shrink-0 transition" :class="isChildActive(menu) ? 'text-sky-600' : 'text-gray-600 group-hover:text-sky-600'" />
              <span class="font-medium flex-1 transition" :class="isChildActive(menu) ? 'text-sky-700' : 'text-gray-700 group-hover:text-sky-600'">{{ menuText(menu.label) }}</span>
              <Icon
                name="mdi:chevron-down"
                size="18"
                class="transition-transform duration-200"
                :class="[openMenus.has(menu.label) ? 'rotate-180' : '', isChildActive(menu) ? 'text-sky-600' : 'text-gray-400 group-hover:text-sky-600']"
              />
            </button>
            <div v-show="openMenus.has(menu.label)" class="mt-1 ml-3 space-y-0.5 border-l-2 border-gray-100 pl-3">
              <NuxtLink
                v-for="child in menu.children"
                :key="child.path"
                :to="child.path"
                class="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-sky-50 transition group"
                active-class="bg-sky-50 text-sky-600"
                @click="emit('navigate')"
              >
                <Icon :name="child.icon" class="text-lg text-gray-500 group-hover:text-sky-600" />
                <span class="font-medium text-gray-600 group-hover:text-sky-600 text-sm">{{ menuText(child.label) }}</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Regular link -->
          <NuxtLink
            v-else
            :to="menu.path"
            class="flex items-center space-x-3 px-4 py-3 rounded-lg transition group"
            :class="menu.isDanger ? 'hover:bg-gray-50' : 'hover:bg-sky-50'"
            active-class="bg-sky-50 text-sky-600"
            @click="emit('navigate')"
          >
            <Icon :name="menu.icon" class="text-xl text-gray-600 group-hover:text-sky-600" />
            <span class="font-medium text-gray-700 group-hover:text-sky-600">{{ menuText(menu.label) }}</span>
          </NuxtLink>
        </template>
      </ClientOnly>
    </nav>

    <!-- User Section at Bottom -->
    <ClientOnly>
      <div class="p-4 border-t border-gray-200 mt-auto shrink-0">
        <div class="mb-3 flex justify-center">
          <LanguageToggle />
        </div>
        <div class="bg-gray-50 rounded-lg p-3 mb-2">
          <div class="text-xs text-gray-600 mb-1">{{ tr('Masuk sebagai', 'Signed in as') }}</div>
          <div class="font-semibold text-gray-900 text-sm">{{ user?.fullname || '-' }}</div>
          <div v-if="user?.role_names && user.role_names.length > 0" class="text-xs text-sky-600 font-medium mt-1">
            {{ user.role_names.map(r => r.toUpperCase()).join(', ') }}
          </div>
          <div v-else-if="user?.role_name" class="text-xs text-sky-600 font-medium mt-1">
            {{ user.role_name.toUpperCase() }}
          </div>
        </div>
        <button
          @click="onLogout"
          class="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition font-medium"
        >
          <Icon name="mdi:logout" class="text-lg" />
          <span>{{ tr('Keluar', 'Logout') }}</span>
        </button>
      </div>
    </ClientOnly>
  </aside>
</template>

<script setup>
const emit = defineEmits(['navigate'])
const auth = useAuth()
const route = useRoute()
const { tr } = useAppLocale()
const user = ref(null)
const userPermissions = ref([])
const openMenus = ref(new Set())

const menuItems = [
  {
    label: 'Peminjaman',
    icon: 'mdi:calendar-multiple',
    children: [
      { path: '/user/book-room', label: 'Pinjam Ruangan', icon: 'mdi:calendar-check', permission: 'menu.book_room' },
      { path: '/user/bookings', label: 'Peminjaman Saya', icon: 'mdi:book-open-page-variant', permission: 'menu.my_bookings' },
      { path: '/user/calendar', label: 'Kalender Saya', icon: 'mdi:calendar-month', permission: 'menu.my_calendar' },
    ],
  },
  {
    label: 'Operasional',
    icon: 'mdi:key-chain',
    children: [
      { path: '/security/keys', label: 'Satpam / Kunci Ruangan', icon: 'mdi:key-variant', permission: 'menu.security_keys' },
      { path: '/display/rooms', label: 'Display Jadwal Ruangan', icon: 'mdi:monitor-dashboard', permission: 'menu.display_rooms' },
    ],
  },
  { path: '/user/approval-document', label: 'Persetujuan Dokumen', icon: 'mdi:file-sign', permission: 'menu.approval_document' },
  { path: '/user/profile', label: 'Profil Saya', icon: 'mdi:account', permission: 'menu.profile' },
  { divider: true, adminSection: true },
  { section: 'Area Admin', adminSection: true },
  {
    label: 'Ruangan',
    icon: 'mdi:door',
    adminSection: true,
    children: [
      { path: '/admin/rooms', label: 'Manajemen Ruangan', icon: 'mdi:door-open', permission: 'menu.admin_rooms' },
      { path: '/admin/bookings', label: 'Semua Peminjaman', icon: 'mdi:shield-check', permission: 'menu.admin_bookings' },
      { path: '/admin/external-bookings', label: 'Pengajuan External', icon: 'mdi:account-clock', permission: 'menu.admin_external_bookings' },
      { path: '/admin/calendar', label: 'Kalender Peminjaman', icon: 'mdi:calendar-month', permission: 'menu.admin_calendar' },
    ],
  },
  {
    label: 'Pengaturan',
    icon: 'mdi:cog',
    adminSection: true,
    children: [
      { path: '/admin/users', label: 'Manajemen Pengguna', icon: 'mdi:account-cog', permission: 'menu.admin_users' },
      { path: '/admin/roles', label: 'Manajemen Role', icon: 'mdi:shield-account', permission: 'menu.admin_roles' },
      { path: '/admin/permissions', label: 'Manajemen Permission', icon: 'mdi:shield-key', permission: 'menu.admin_permissions' },
      { path: '/admin/settings', label: 'Pengaturan Umum', icon: 'mdi:cog-outline', permission: 'menu.admin_settings' },
    ],
  },
  { divider: true },
  { path: '/', label: 'Beranda', icon: 'mdi:home', isDanger: true },
]

const hasAdminPermission = computed(() => {
  return userPermissions.value.some(p => p.startsWith('menu.admin_'))
})

const visibleMenus = computed(() => {
  if (!user.value) return []
  const perms = new Set(userPermissions.value)

  return menuItems
    .map(menu => {
      if (menu.children) {
        const visibleChildren = menu.children.filter(c => !c.permission || perms.has(c.permission))
        if (visibleChildren.length === 0) return null
        return { ...menu, children: visibleChildren }
      }
      return menu
    })
    .filter(menu => {
      if (!menu) return false
      if (menu.adminSection) return hasAdminPermission.value
      if (menu.permission) return perms.has(menu.permission)
      return true
    })
})

const menuLabelMap = {
  Peminjaman: ['Peminjaman', 'Bookings'],
  'Pinjam Ruangan': ['Pinjam Ruangan', 'Book Room'],
  'Peminjaman Saya': ['Peminjaman Saya', 'My Bookings'],
  'Kalender Saya': ['Kalender Saya', 'My Calendar'],
  Operasional: ['Operasional', 'Operations'],
  'Satpam / Kunci Ruangan': ['Satpam / Kunci Ruangan', 'Security / Room Keys'],
  'Display Jadwal Ruangan': ['Display Jadwal Ruangan', 'Room Schedule Display'],
  'Persetujuan Dokumen': ['Persetujuan Dokumen', 'Document Approval'],
  'Profil Saya': ['Profil Saya', 'My Profile'],
  'Area Admin': ['Area Admin', 'Admin Area'],
  Ruangan: ['Ruangan', 'Rooms'],
  'Manajemen Ruangan': ['Manajemen Ruangan', 'Room Management'],
  'Semua Peminjaman': ['Semua Peminjaman', 'All Bookings'],
  'Kalender Peminjaman': ['Kalender Peminjaman', 'Booking Calendar'],
  Pengaturan: ['Pengaturan', 'Settings'],
  'Manajemen Pengguna': ['Manajemen Pengguna', 'User Management'],
  'Manajemen Role': ['Manajemen Role', 'Role Management'],
  'Manajemen Permission': ['Manajemen Permission', 'Permission Management'],
  'Pengaturan Umum': ['Pengaturan Umum', 'General Settings'],
  Beranda: ['Beranda', 'Home'],
}

function menuText(value) {
  const pair = menuLabelMap[value]
  if (!pair) return value
  return tr(pair[0], pair[1])
}

function toggleMenu(label) {
  const next = new Set(openMenus.value)
  if (next.has(label)) {
    next.delete(label)
  } else {
    next.add(label)
  }
  openMenus.value = next
}

function isChildActive(menu) {
  if (!menu.children) return false
  return menu.children.some(c => c.path && route.path.startsWith(c.path) && c.path !== '/')
}

function syncOpenMenus() {
  const next = new Set(openMenus.value)
  for (const menu of menuItems) {
    if (menu.children) {
      const active = menu.children.some(c => c.path && route.path.startsWith(c.path) && c.path !== '/')
      if (active) next.add(menu.label)
    }
  }
  openMenus.value = next
}

onMounted(async () => {
  auth.loadFromStorage()
  if (auth.isLoggedIn.value) {
    try {
      const [userData, permData] = await Promise.all([
        $fetch('/api/auth/me', { headers: auth.authHeaders() }),
        $fetch('/api/auth/permissions', { headers: auth.authHeaders() }),
      ])
      user.value = userData.user
      userPermissions.value = permData.permissions || []
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    }
  }
  syncOpenMenus()
})

watch(() => route.path, syncOpenMenus)

function onLogout() {
  auth.logout()
  navigateTo('/auth/login')
}
</script>
