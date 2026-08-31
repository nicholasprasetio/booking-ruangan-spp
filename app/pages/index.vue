<template>
  <div class="min-h-screen bg-slate-50">
    <div class="container mx-auto px-4 py-8">
      <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ tr('Peminjaman Ruangan', 'Room Booking') }}</h1>
          <p class="text-gray-600 mt-2 max-w-2xl">
            {{ tr('Pilih tanggal, cek ruangan yang tersedia, lalu lanjutkan pengajuan tanpa perlu registrasi.', 'Choose a date, check available rooms, then continue the request without registration.') }}
          </p>
        </div>
        <!-- <NuxtLink to="/auth/login" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition">
          <Icon name="mdi:login" />
          {{ tr('Login Admin/User', 'Admin/User Login') }}
        </NuxtLink> -->
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        <aside class="bg-white rounded-2xl shadow border border-gray-100 p-5 h-fit">
          <h2 class="text-lg font-bold text-gray-900">{{ tr('Cari Ruangan', 'Find Rooms') }}</h2>
          <div class="mt-4 space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Tanggal', 'Date') }}</label>
              <input
                v-model="date"
                type="date"
                :min="dateMin"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              <p v-if="dateMin" class="mt-1 text-xs text-gray-500">
                {{ tr(`Tanggal paling cepat: ${dateMin}`, `Earliest date: ${dateMin}`) }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Mulai', 'Start') }}</label>
                <select v-model="startTime" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none">
                  <option value="">{{ tr('Opsional', 'Optional') }}</option>
                  <option v-for="time in startOptions" :key="time" :value="time">{{ time }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Selesai', 'End') }}</label>
                <select v-model="endTime" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none">
                  <option value="">{{ tr('Opsional', 'Optional') }}</option>
                  <option v-for="time in endOptions" :key="time" :value="time">{{ time }}</option>
                </select>
              </div>
            </div>

            <div v-if="timeWarning" class="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 p-3 text-sm">
              {{ timeWarning }}
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Cari Ruangan', 'Search Room') }}</label>
              <div class="relative">
                <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="search"
                  type="text"
                  :placeholder="tr('Nama, lokasi, deskripsi...', 'Name, location, description...')"
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white outline-none"
                />
              </div>
            </div>

            <button
              class="w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
              :disabled="loading || !canSearch"
              @click="refreshRooms"
            >
              {{ loading ? tr('Mencari...', 'Searching...') : tr('Cari Ruangan', 'Find Rooms') }}
            </button>
          </div>
        </aside>

        <main>
          <div v-if="error" class="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm">
            {{ error }}
          </div>

          <div class="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ tr('Daftar Ruangan', 'Room List') }}</h2>
              <p class="text-sm text-gray-600">
                <span v-if="hasRequestedRange">{{ tr('Full available ditampilkan lebih dulu, lalu slot partial.', 'Fully available rooms are shown first, then partial slots.') }}</span>
                <span v-else>{{ tr('Pilih ruangan dulu. Jam final bisa dipilih di halaman pengajuan.', 'Choose a room first. Final time can be selected on the request page.') }}</span>
              </p>
            </div>
            <div class="text-sm font-semibold text-gray-600">
              {{ meta.total }} {{ tr('ruangan', 'rooms') }}
            </div>
          </div>

          <div v-if="loading" class="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-600">
            {{ tr('Memuat ruangan...', 'Loading rooms...') }}
          </div>

          <div v-else-if="rooms.length === 0" class="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-600">
            {{ hasRequestedRange ? tr('Tidak ada ruangan yang punya slot tersedia pada rentang tersebut.', 'No rooms have available slots in that range.') : tr('Tidak ada ruangan ditemukan.', 'No rooms found.') }}
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <article
              v-for="room in rooms"
              :key="room.id"
              class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden flex flex-col"
            >
              <div class="aspect-[16/9] bg-gray-100">
                <img v-if="room.photos?.length" :src="room.photos[0]?.url" :alt="room.name || 'Ruangan'" class="h-full w-full object-cover" />
                <div v-else class="h-full w-full flex items-center justify-center text-gray-400">
                  <Icon name="mdi:door-open" size="42" />
                </div>
              </div>

              <div class="p-5 flex flex-col flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="font-bold text-gray-900 text-lg">{{ room.name || `${tr('Ruangan', 'Room')} #${room.id}` }}</h3>
                    <p class="text-sm text-gray-600 mt-1">{{ room.location || '-' }}</p>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="statusClass(room.availability_status)">
                    {{ statusLabel(room.availability_status) }}
                  </span>
                </div>

                <div class="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                  <div>
                    <div class="text-xs text-gray-500 font-semibold uppercase">{{ tr('Kapasitas', 'Capacity') }}</div>
                    <div class="mt-1">{{ room.capacity ? `${room.capacity} ${tr('orang', 'people')}` : '-' }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 font-semibold uppercase">{{ tr('Jam', 'Hours') }}</div>
                    <div class="mt-1">{{ room.open_time_start || '00:00' }} - {{ room.open_time_end || '24:00' }}</div>
                  </div>
                </div>

                <div class="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm">
                  <div class="text-xs text-gray-500 font-semibold uppercase">{{ tr('Slot Kosong', 'Available Slots') }}</div>
                  <p class="mt-1 text-gray-700">{{ formatRanges(room.available_ranges || []) }}</p>
                </div>

                <p class="mt-4 text-sm text-gray-600 line-clamp-3 whitespace-pre-line">{{ room.description || '-' }}</p>

                <button
                  type="button"
                  class="mt-5 w-full px-4 py-3 rounded-xl font-semibold transition disabled:opacity-50"
                  :class="(room.available_ranges || []).length ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-500'"
                  :disabled="!(room.available_ranges || []).length"
                  @click="openRequest(room)"
                >
                  {{ tr('Ajukan Peminjaman', 'Request Booking') }}
                </button>
              </div>
            </article>
          </div>

          <div class="mt-6">
            <Pagination :meta="meta" @change="onPageChange" />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoomSchedule } from '~/models/booking'
import type { PaginationMeta } from '~/models/pagination'
import { fetchPublicRoomAvailability } from '~/services/publicBooking'

const { tr } = useAppLocale()

const loading = ref(false)
const error = ref<string | null>(null)
const rooms = ref<RoomSchedule[]>([])
const search = ref('')
const page = ref(1)
const pageSize = 9
const meta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })
const minLeadDays = ref(0)

function jakartaTodayYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function addDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const dateMin = computed(() => addDays(jakartaTodayYmd(), Math.max(0, minLeadDays.value)))
const date = ref(jakartaTodayYmd())
const startTime = ref('')
const endTime = ref('')

function toTimeLabel(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

const allTimes = computed(() => {
  const times: string[] = []
  for (let min = 6 * 60; min <= 22 * 60; min += 30) {
    times.push(toTimeLabel(min))
  }
  return times
})

const startOptions = computed(() => allTimes.value.slice(0, -1))
const endOptions = computed(() => (startTime.value ? allTimes.value.filter((time) => toMinutes(time) > toMinutes(startTime.value)) : allTimes.value.slice(1)))
const hasRequestedRange = computed(() => Boolean(startTime.value && endTime.value))
const hasPartialTime = computed(() => Boolean(startTime.value) !== Boolean(endTime.value))
const isTimeOrderValid = computed(() => !hasRequestedRange.value || toMinutes(endTime.value) > toMinutes(startTime.value))
const canSearch = computed(() => Boolean(date.value) && !hasPartialTime.value && isTimeOrderValid.value)
const timeWarning = computed(() => {
  if (hasPartialTime.value) return tr('Lengkapi jam mulai dan selesai, atau kosongkan keduanya.', 'Fill both start and end time, or leave both blank.')
  if (!isTimeOrderValid.value) return tr('Jam selesai harus setelah jam mulai.', 'End time must be after start time.')
  return ''
})

function statusLabel(status?: string) {
  if (status === 'full') return tr('Tersedia', 'Available')
  if (status === 'partial') return hasRequestedRange.value ? tr('Tersedia Sebagian', 'Partial Available') : tr('Tersedia', 'Available')
  return tr('Tidak Tersedia', 'Unavailable')
}

function statusClass(status?: string) {
  if (status === 'full') return 'bg-emerald-50 text-emerald-700'
  if (status === 'partial') return 'bg-amber-50 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

function formatRanges(ranges: Array<{ startTime: string; endTime: string }>): string {
  if (!ranges.length) return tr('Tidak ada slot kosong.', 'No open slots.')
  const shown = ranges.slice(0, 3).map((range) => `${range.startTime}-${range.endTime}`)
  const suffix = ranges.length > 3 ? ` +${ranges.length - 3}` : ''
  return `${tr('Tersedia:', 'Available:')} ${shown.join(', ')}${suffix}`
}

async function loadInitialSettings() {
  const settingsRes = await $fetch<{ ok: boolean; settings: { booking_min_lead_days: number } }>('/api/settings/general')
  minLeadDays.value = Number(settingsRes.settings.booking_min_lead_days || 0)
  if (date.value < dateMin.value) {
    date.value = dateMin.value
  }
}

async function refreshRooms() {
  if (!canSearch.value) return
  loading.value = true
  error.value = null
  try {
    const res = await fetchPublicRoomAvailability({
      date: date.value,
      startTime: hasRequestedRange.value ? startTime.value : undefined,
      endTime: hasRequestedRange.value ? endTime.value : undefined,
      page: page.value,
      pageSize,
      search: search.value.trim() || undefined,
    })
    rooms.value = res.data || []
    meta.value = res.meta
  } catch (e: any) {
    rooms.value = []
    meta.value = { page: 1, pageSize, total: 0, totalPages: 1 }
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat ruangan.', 'Failed to load rooms.')
  } finally {
    loading.value = false
  }
}

function openRequest(room: RoomSchedule) {
  const query: Record<string, string> = {
    roomId: String(room.id),
    date: date.value,
  }

  if (hasRequestedRange.value && room.availability_status === 'full') {
    query.startTime = startTime.value
    query.endTime = endTime.value
  } else if (hasRequestedRange.value && room.available_ranges?.length) {
    query.startTime = room.available_ranges[0]!.startTime
    query.endTime = room.available_ranges[0]!.endTime
  }

  navigateTo({ path: '/external-booking/request', query })
}

function onPageChange(nextPage: number) {
  page.value = nextPage
  refreshRooms()
}

watch([date, startTime, endTime], () => {
  if (endTime.value && startTime.value && toMinutes(endTime.value) <= toMinutes(startTime.value)) {
    endTime.value = ''
  }
  page.value = 1
  refreshRooms()
})

watch(search, () => {
  page.value = 1
  refreshRooms()
})

onMounted(async () => {
  await loadInitialSettings()
  await refreshRooms()
})
</script>
