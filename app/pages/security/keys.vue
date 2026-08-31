<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4 space-y-6">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Satpam / Kunci Ruangan</h1>
          <p class="text-gray-600 mt-1">Pantau kunci yang sedang dipinjam dan jadwal pengambilan kunci berikutnya.</p>
        </div>
        <div class="flex gap-2">
          <NuxtLink to="/security/scan" class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 inline-flex items-center gap-2">
            <Icon name="mdi:qrcode-scan" />
            Scan QR
          </NuxtLink>
          <button class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200" :disabled="loading" @click="load">
            Perbarui
          </button>
        </div>
      </div>

      <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{{ error }}</div>
      <div v-if="loading" class="rounded-2xl bg-white p-8 text-center shadow text-gray-600">Memuat data kunci...</div>

      <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-bold text-gray-900">Sedang Dipinjam</h2>
            <span class="text-sm text-gray-500">{{ borrowed.length }} kunci</span>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="item in borrowed" :key="item.id" class="p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-xl font-bold text-gray-900">{{ item.room_name || '-' }}</div>
                  <div class="text-sm text-gray-600">{{ item.activity_name || 'Peminjaman Ruangan' }}</div>
                  <div class="text-sm text-gray-500 mt-2">{{ formatRange(item.start_at, item.end_at) }}</div>
                </div>
                <span class="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">Belum kembali</span>
              </div>
              <div class="mt-3 text-sm text-gray-600">Diambil: {{ formatDateTime(item.picked_up_at) }} oleh {{ item.picked_up_by_name || '-' }}</div>
            </div>
            <div v-if="borrowed.length === 0" class="p-8 text-center text-gray-500">Tidak ada kunci yang sedang dipinjam.</div>
          </div>
        </section>

        <section class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-bold text-gray-900">Siap Diambil</h2>
            <span class="text-sm text-gray-500">{{ ready.length }} sesi</span>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="item in ready" :key="item.id" class="p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-xl font-bold text-gray-900">{{ item.room_name || '-' }}</div>
                  <div class="text-sm text-gray-600">{{ item.activity_name || 'Peminjaman Ruangan' }}</div>
                  <div class="text-sm text-gray-500 mt-2">{{ formatRange(item.start_at, item.end_at) }}</div>
                </div>
                <NuxtLink :to="`/security/scan?token=${encodeURIComponent(item.token)}`" class="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100">
                  Scan
                </NuxtLink>
              </div>
              <div class="mt-3 text-xs text-gray-400">Token: {{ item.token }}</div>
            </div>
            <div v-if="ready.length === 0" class="p-8 text-center text-gray-500">Belum ada sesi siap ambil.</div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchSecurityKeys } from '~/services/securityKeys'

const auth = useAuth()
auth.loadFromStorage()
const { localeTag } = useAppLocale()

const loading = ref(false)
const error = ref<string | null>(null)
const rows = ref<any[]>([])

const borrowed = computed(() => rows.value.filter((item) => item.picked_up_at && !item.returned_at))
const ready = computed(() => rows.value.filter((item) => !item.picked_up_at))

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchSecurityKeys(auth.authHeaders(), 8)
    rows.value = res.data || []
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Gagal memuat data kunci.'
  } finally {
    loading.value = false
  }
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString(localeTag.value, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatRange(start: string, end: string) {
  return `${formatDateTime(start)} - ${formatDateTime(end)}`
}

onMounted(load)
</script>
