<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Pinjam Ruangan', 'Book Room') }}</h1>
            <p class="text-gray-600 mt-1">
              {{ tr('Jelajahi dan ajukan peminjaman ruangan yang tersedia.', 'Explore available rooms and submit your booking request.') }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="relative">
              <Icon name="mdi:calendar" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="date"
                type="date"
                class="pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                @change="refresh()"
              />
            </div>
            <div class="relative">
              <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="search"
                type="text"
                :placeholder="tr('Cari ruangan...', 'Search room...')"
                class="pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              />
            </div>
            <button
              class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm"
              :disabled="loading"
              @click="refresh()"
            >
              {{ tr('Perbarui', 'Refresh') }}
            </button>
          </div>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
          {{ error }}
        </div>

        <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
          {{ tr('Memuat data ruangan...', 'Loading room data...') }}
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="room in rooms"
            :key="room.id"
            class="bg-white rounded-3xl shadow-xl p-6 border"
            :class="borderClass(availability(room))"
          >
            <div
              class="relative aspect-[16/9] w-full rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden group"
              @touchstart.passive="onCardTouchStart(room.id, $event)"
              @touchend.passive="onCardTouchEnd(room.id, $event)"
            >
              <img
                v-if="room.photos?.length"
                :src="room.photos[getRoomPhotoIndex(room.id)]?.url"
                :alt="tr('Foto ruangan', 'Room photo')"
                class="h-full w-full object-contain cursor-pointer"
                @click="openGallery(room, getRoomPhotoIndex(room.id))"
              />
              <div v-else class="h-full w-full flex items-center justify-center text-sm text-gray-500">
                {{ tr('Belum ada foto', 'No photos yet') }}
              </div>

              <div v-if="room.photos?.length > 1" class="absolute inset-0 flex items-center justify-between px-3 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                <button
                  class="h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/70 pointer-events-auto"
                  @click.stop="prevRoomPhoto(room.id)"
                >
                  <Icon name="mdi:chevron-left" />
                </button>
                <button
                  class="h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/70 pointer-events-auto"
                  @click.stop="nextRoomPhoto(room.id)"
                >
                  <Icon name="mdi:chevron-right" />
                </button>
              </div>
            </div>

            <div class="mt-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-xl font-bold text-gray-900">
                  {{ room.name || `${tr('Ruangan', 'Room')} #${room.id}` }}
                </h2>
                <p class="text-sm text-gray-600 mt-1">
                  {{ tr('Waktu Operasional:', 'Operating Hours:') }}
                  <span v-if="room.open_time_start && room.open_time_end">
                    {{ room.open_time_start }} - {{ room.open_time_end }} {{ tr('WIB', 'WIB') }}
                  </span>
                  <span v-else>{{ tr('Tersedia Sepanjang Hari', 'Available All Day') }}</span>
                </p>
              </div>

              <div
                class="px-3 py-1 rounded-full text-xs font-semibold"
                :class="badgeClass(availability(room))"
              >
                {{ statusLabel(availability(room)) }}
              </div>
            </div>

            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ tr('Lokasi', 'Location') }}</div>
                <div class="mt-1">{{ room.location || '-' }}</div>
              </div>
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ tr('Kapasitas', 'Capacity') }}</div>
                <div class="mt-1">{{ room.capacity ? `${room.capacity} ${tr('orang', 'people')}` : '-' }}</div>
              </div>
            </div>

            <div class="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ tr('Deskripsi', 'Description') }}</div>
              <div class="mt-2 text-sm text-gray-700 whitespace-pre-line break-words">
                {{ room.description || '-' }}
              </div>
            </div>

            <div class="mt-5">
              <div class="flex items-center justify-between gap-3">
                <NuxtLink
                  v-if="availability(room) !== 'fully_booked' && availability(room) !== 'unavailable'"
                  :to="`/user/book-room/request/${room.id}?date=${date}`"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                  <Icon name="mdi:calendar-check-outline" />
                  {{ tr('Ajukan Peminjaman', 'Submit Booking') }}
                </NuxtLink>
                <span
                  v-else
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600"
                >
                  <Icon name="mdi:calendar-remove-outline" />
                  {{ tr('Tidak Tersedia', 'Unavailable') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <Pagination :meta="meta" @change="onPageChange" />
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="showGallery"
      class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      @click.self="closeGallery"
    >
      <div class="bg-white rounded-3xl shadow-2xl max-w-5xl w-full p-4 md:p-6">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <div class="text-xl font-bold text-gray-900">
              {{ galleryRoom?.name || `${tr('Ruangan', 'Room')} #${galleryRoom?.id}` }}
            </div>
            <div class="text-sm text-gray-600">{{ tr('Galeri Ruangan', 'Room Gallery') }}</div>
          </div>
          <button class="h-9 w-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200" @click="closeGallery">
            <Icon name="mdi:close" />
          </button>
        </div>

        <div class="flex flex-col lg:flex-row gap-4">
          <div
            class="relative aspect-[16/9] w-full lg:flex-1 rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden"
            @touchstart.passive="onModalTouchStart($event)"
            @touchend.passive="onModalTouchEnd($event)"
          >
            <img
              v-if="galleryRoom?.photos?.length"
              :src="galleryRoom.photos[galleryIndex]?.url"
              :alt="tr('Foto ruangan', 'Room photo')"
              class="h-full w-full object-contain"
            />
            <div v-else class="h-full w-full flex items-center justify-center text-sm text-gray-500">
              {{ tr('Belum ada foto', 'No photos yet') }}
            </div>

            <div v-if="galleryRoom?.photos?.length > 1" class="absolute inset-0 flex items-center justify-between px-3">
              <button
                class="h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/70"
                @click.stop="prevGalleryPhoto"
              >
                <Icon name="mdi:chevron-left" />
              </button>
              <button
                class="h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/70"
                @click.stop="nextGalleryPhoto"
              >
                <Icon name="mdi:chevron-right" />
              </button>
            </div>
          </div>

          <div v-if="galleryRoom?.photos?.length > 1" class="hidden lg:block w-28 shrink-0">
            <div class="h-full max-h-[360px] overflow-y-auto pr-1 space-y-2">
              <button
                v-for="(photo, idx) in galleryRoom.photos"
                :key="photo.id"
                class="rounded-xl overflow-hidden border w-full"
                :class="idx === galleryIndex ? 'border-indigo-500' : 'border-gray-100'"
                @click="galleryIndex = idx"
              >
                  <img :src="photo.url" :alt="tr('Foto ruangan', 'Room photo')" class="h-16 w-full object-contain bg-gray-50" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="galleryRoom?.photos?.length > 1" class="mt-4 grid grid-cols-4 sm:grid-cols-6 gap-2 lg:hidden">
          <button
            v-for="(photo, idx) in galleryRoom.photos"
            :key="photo.id"
            class="rounded-xl overflow-hidden border"
            :class="idx === galleryIndex ? 'border-indigo-500' : 'border-gray-100'"
            @click="galleryIndex = idx"
          >
              <img :src="photo.url" :alt="tr('Foto ruangan', 'Room photo')" class="h-16 w-full object-contain bg-gray-50" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { RoomSchedule } from '~/models/booking'
import type { PaginationMeta } from '~/models/pagination'
import { fetchRoomsSchedule } from '~/services/rooms'

const auth = useAuth()
const { tr } = useAppLocale()
auth.loadFromStorage()

const loading = ref(false)
const error = ref<string | null>(null)
const rooms = ref<RoomSchedule[]>([])
const roomPhotoIndex = ref<Record<number, number>>({})
const touchStartX = ref(0)
const touchStartY = ref(0)

function today(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const date = ref<string>(today())
const search = ref<string>('')
const page = ref(1)
const pageSize = 6
const meta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })

type Availability = 'fully_booked' | 'partially_available' | 'available' | 'unavailable'

function statusLabel(s: Availability) {
  if (s === 'unavailable') return tr('Tidak Tersedia', 'Unavailable')
  if (s === 'fully_booked') return tr('Penuh', 'Full')
  if (s === 'partially_available') return tr('Tersedia Sebagian', 'Partially Available')
  return tr('Tersedia', 'Available')
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getMinutes(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function availability(room: RoomSchedule): Availability {
  if (room.status === 'unavailable' || room.available_for_booking === false || room.available_for_booking === 0) {
    return 'unavailable'
  }

  const openStart = room.open_time_start || '08:00'
  const openEnd = room.open_time_end || '20:00'
  const openStartMin = toMinutes(openStart)
  const openEndMin = toMinutes(openEnd)
  if (!Number.isFinite(openStartMin) || !Number.isFinite(openEndMin) || openStartMin >= openEndMin) {
    return 'available'
  }

  if (!room.bookings || room.bookings.length === 0) return 'available'

  const intervals = room.bookings
    .map((b) => {
      const start = getMinutes(b.start)
      const end = getMinutes(b.end)
      const s = Math.max(start, openStartMin)
      const e = Math.min(end, openEndMin)
      return s < e ? { start: s, end: e } : null
    })
    .filter((i): i is { start: number; end: number } => i !== null)
    .sort((a, b) => a.start - b.start)

  if (intervals.length === 0) return 'available'

  let covered = 0
  let curStart = intervals[0].start
  let curEnd = intervals[0].end
  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i]
    if (next.start <= curEnd) {
      curEnd = Math.max(curEnd, next.end)
    } else {
      covered += curEnd - curStart
      curStart = next.start
      curEnd = next.end
    }
  }
  covered += curEnd - curStart

  const total = openEndMin - openStartMin
  if (covered >= total) return 'fully_booked'
  return 'partially_available'
}

function borderClass(s: Availability) {
  if (s === 'unavailable') return 'border-gray-200'
  if (s === 'fully_booked') return 'border-red-200'
  if (s === 'partially_available') return 'border-yellow-200'
  return 'border-emerald-200'
}

function badgeClass(s: Availability) {
  if (s === 'unavailable') return 'bg-gray-100 text-gray-700'
  if (s === 'fully_booked') return 'bg-red-50 text-red-700'
  if (s === 'partially_available') return 'bg-yellow-50 text-yellow-800'
  return 'bg-emerald-50 text-emerald-800'
}

function getRoomPhotoIndex(roomId: number) {
  return roomPhotoIndex.value[roomId] ?? 0
}

function setRoomPhotoIndex(roomId: number, nextIndex: number) {
  roomPhotoIndex.value = { ...roomPhotoIndex.value, [roomId]: nextIndex }
}

function nextRoomPhoto(roomId: number) {
  const room = rooms.value.find((r) => r.id === roomId)
  if (!room?.photos?.length) return
  const next = (getRoomPhotoIndex(roomId) + 1) % room.photos.length
  setRoomPhotoIndex(roomId, next)
}

function prevRoomPhoto(roomId: number) {
  const room = rooms.value.find((r) => r.id === roomId)
  if (!room?.photos?.length) return
  const current = getRoomPhotoIndex(roomId)
  const next = (current - 1 + room.photos.length) % room.photos.length
  setRoomPhotoIndex(roomId, next)
}

function onCardTouchStart(roomId: number, event: TouchEvent) {
  if (!event.touches.length) return
  touchStartX.value = event.touches[0].clientX
  touchStartY.value = event.touches[0].clientY
  setRoomPhotoIndex(roomId, getRoomPhotoIndex(roomId))
}

function onCardTouchEnd(roomId: number, event: TouchEvent) {
  const touch = event.changedTouches[0]
  const dx = touch.clientX - touchStartX.value
  const dy = touch.clientY - touchStartY.value
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
  if (dx < 0) nextRoomPhoto(roomId)
  else prevRoomPhoto(roomId)
}

const showGallery = ref(false)
const galleryRoom = ref<RoomSchedule | null>(null)
const galleryIndex = ref(0)

function openGallery(room: RoomSchedule, index = 0) {
  galleryRoom.value = room
  galleryIndex.value = index
  showGallery.value = true
}

function closeGallery() {
  showGallery.value = false
  galleryRoom.value = null
  galleryIndex.value = 0
}

function nextGalleryPhoto() {
  if (!galleryRoom.value?.photos?.length) return
  galleryIndex.value = (galleryIndex.value + 1) % galleryRoom.value.photos.length
}

function prevGalleryPhoto() {
  if (!galleryRoom.value?.photos?.length) return
  galleryIndex.value = (galleryIndex.value - 1 + galleryRoom.value.photos.length) % galleryRoom.value.photos.length
}

function onModalTouchStart(event: TouchEvent) {
  if (!event.touches.length) return
  touchStartX.value = event.touches[0].clientX
  touchStartY.value = event.touches[0].clientY
}

function onModalTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  const dx = touch.clientX - touchStartX.value
  const dy = touch.clientY - touchStartY.value
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
  if (dx < 0) nextGalleryPhoto()
  else prevGalleryPhoto()
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchRoomsSchedule(
      {
        date: date.value,
        page: page.value,
        pageSize,
        search: search.value.trim() || undefined,
      },
      auth.authHeaders(),
    )
    rooms.value = res.data || []
    meta.value = res.meta
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat jadwal ruangan.', 'Failed to load room schedule.')
  } finally {
    loading.value = false
  }
}

function onPageChange(nextPage: number) {
  page.value = nextPage
  refresh()
}

watch(search, () => {
  page.value = 1
  refresh()
})

watch(date, () => {
  page.value = 1
  refresh()
})

onMounted(() => {
  refresh()
})
</script>
