<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ tr('Pengajuan Booking External', 'External Booking Requests') }}</h1>
          <p class="text-gray-600 mt-1">{{ tr('Review pengajuan public sebelum dibuat menjadi booking.', 'Review public requests before creating bookings.') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="px-4 py-2 rounded-xl text-sm font-semibold transition"
            :class="status === tab.value ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'"
            @click="setStatus(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 mb-6">
        <div class="relative">
          <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none"
            :placeholder="tr('Cari nama, HP, ruangan, tujuan...', 'Search name, phone, room, purpose...')"
          />
        </div>
      </div>

      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
        {{ error }}
      </div>

      <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
        {{ tr('Memuat pengajuan...', 'Loading requests...') }}
      </div>

      <div v-else class="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div v-if="requests.length === 0" class="p-10 text-center text-gray-600">
          {{ tr('Belum ada pengajuan.', 'No requests yet.') }}
        </div>
        <div v-else class="divide-y divide-gray-100">
          <div v-for="item in requests" :key="item.id" class="p-5">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-bold text-gray-900">{{ item.requester_name }}</h2>
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="statusClass(item.status)">
                    {{ statusLabel(item.status) }}
                  </span>
                  <span class="text-xs text-gray-500">#{{ item.id }}</span>
                </div>
                <div class="mt-1 text-sm text-gray-600">
                  {{ item.requester_phone }}
                  <span v-if="item.origin_environment"> - {{ item.origin_environment }}</span>
                </div>
                <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div class="text-xs font-semibold uppercase text-gray-500">{{ tr('Ruangan', 'Room') }}</div>
                    <div class="mt-1 text-gray-800">{{ item.room_name || `#${item.room_id}` }}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold uppercase text-gray-500">{{ tr('Jadwal', 'Schedule') }}</div>
                    <div class="mt-1 text-gray-800">{{ item.request_date }} {{ item.start_time }}-{{ item.end_time }}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold uppercase text-gray-500">{{ tr('Peserta', 'Participants') }}</div>
                    <div class="mt-1 text-gray-800">{{ item.participant_count }} {{ tr('orang', 'people') }}</div>
                  </div>
                </div>
                <div class="mt-3 text-sm text-gray-700">
                  <span class="font-semibold">{{ tr('Tujuan', 'Purpose') }}:</span> {{ item.purpose }}
                </div>
                <div v-if="item.notes" class="mt-1 text-sm text-gray-600">
                  <span class="font-semibold">{{ tr('Catatan', 'Notes') }}:</span> {{ item.notes }}
                </div>
                <div v-if="item.rejection_reason" class="mt-2 text-sm text-red-700">
                  <span class="font-semibold">{{ tr('Alasan ditolak', 'Rejection reason') }}:</span> {{ item.rejection_reason }}
                </div>
                <NuxtLink
                  v-if="item.accepted_booking_id"
                  :to="`/bookings/${item.accepted_booking_id}`"
                  class="mt-2 inline-flex text-sm font-semibold text-indigo-600 hover:underline"
                >
                  {{ tr('Lihat booking', 'View booking') }} #{{ item.accepted_booking_id }}
                </NuxtLink>
              </div>

              <div class="flex flex-wrap lg:justify-end gap-2">
                <button
                  v-if="item.request_letter_object_key"
                  class="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100 transition"
                  @click="openLetter(item)"
                >
                  {{ tr('Buka Surat', 'Open Letter') }}
                </button>
                <button
                  v-if="item.status === 'pending'"
                  class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
                  @click="openAcceptModal(item)"
                >
                  {{ tr('Accept', 'Accept') }}
                </button>
                <button
                  v-if="item.status === 'pending'"
                  class="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
                  @click="rejectRequest(item)"
                >
                  {{ tr('Tolak', 'Reject') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <Pagination :meta="meta" @change="onPageChange" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="accepting" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" @click.self="accepting = null">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ tr('Accept Pengajuan', 'Accept Request') }}</h2>
              <p class="text-sm text-gray-600 mt-1">{{ accepting.requester_name }}</p>
            </div>
            <button class="h-9 w-9 rounded-full bg-gray-100 text-gray-700" @click="accepting = null">
              <Icon name="mdi:close" />
            </button>
          </div>

          <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Tanggal', 'Date') }}</label>
              <input v-model="acceptForm.date" type="date" class="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Ruangan', 'Room') }}</label>
              <select v-model.number="acceptForm.roomId" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none">
                <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name || `#${room.id}` }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Mulai', 'Start') }}</label>
              <select v-model="acceptForm.startTime" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none">
                <option v-for="time in startOptions" :key="time" :value="time">{{ time }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Selesai', 'End') }}</label>
              <select v-model="acceptForm.endTime" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none">
                <option v-for="time in endOptions" :key="time" :value="time">{{ time }}</option>
              </select>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold" @click="accepting = null">
              {{ tr('Batal', 'Cancel') }}
            </button>
            <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60" :disabled="actionBusy" @click="acceptRequest">
              {{ actionBusy ? tr('Memproses...', 'Processing...') : tr('Accept & Buat Booking', 'Accept & Create Booking') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import type { ExternalBookingRequest } from '~/models/external-booking'
import type { PaginationMeta } from '~/models/pagination'
import type { Room } from '~/models/room'
import { acceptExternalBookingRequest, fetchAdminExternalBookingRequests, rejectExternalBookingRequest } from '~/services/adminExternalBookings'
import { fetchAdminRooms } from '~/services/adminRooms'

const { tr } = useAppLocale()
const auth = useAuth()
auth.loadFromStorage()

const tabs = computed(() => [
  { value: 'pending', label: tr('Pending', 'Pending') },
  { value: 'accepted', label: tr('Accepted', 'Accepted') },
  { value: 'rejected', label: tr('Rejected', 'Rejected') },
  { value: 'all', label: tr('Semua', 'All') },
])

const loading = ref(false)
const actionBusy = ref(false)
const error = ref<string | null>(null)
const requests = ref<ExternalBookingRequest[]>([])
const rooms = ref<Room[]>([])
const status = ref('pending')
const search = ref('')
const page = ref(1)
const pageSize = 10
const meta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })
const accepting = ref<ExternalBookingRequest | null>(null)
const acceptForm = reactive({ roomId: 0, date: '', startTime: '08:00', endTime: '09:00' })

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
  for (let min = 6 * 60; min <= 22 * 60; min += 30) times.push(toTimeLabel(min))
  return times
})
const startOptions = computed(() => allTimes.value.slice(0, -1))
const endOptions = computed(() => allTimes.value.filter((time) => toMinutes(time) > toMinutes(acceptForm.startTime)))

function statusLabel(value: string) {
  if (value === 'accepted') return tr('Accepted', 'Accepted')
  if (value === 'rejected') return tr('Rejected', 'Rejected')
  return tr('Pending', 'Pending')
}

function statusClass(value: string) {
  if (value === 'accepted') return 'bg-emerald-50 text-emerald-700'
  if (value === 'rejected') return 'bg-red-50 text-red-700'
  return 'bg-yellow-50 text-yellow-800'
}

async function loadRequests() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchAdminExternalBookingRequests(
      { page: page.value, pageSize, status: status.value, search: search.value.trim() || undefined },
      auth.authHeaders(),
    )
    requests.value = res.data || []
    meta.value = res.meta
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat pengajuan.', 'Failed to load requests.')
  } finally {
    loading.value = false
  }
}

async function loadRooms() {
  const res = await fetchAdminRooms({ page: 1, pageSize: 1000 }, auth.authHeaders())
  rooms.value = (res.data || []).filter(room => room.available_for_booking !== false && room.available_for_booking !== 0)
}

function setStatus(next: string) {
  status.value = next
  page.value = 1
  loadRequests()
}

function onPageChange(nextPage: number) {
  page.value = nextPage
  loadRequests()
}

function openAcceptModal(item: ExternalBookingRequest) {
  accepting.value = item
  acceptForm.roomId = item.room_id
  acceptForm.date = item.request_date
  acceptForm.startTime = item.start_time
  acceptForm.endTime = item.end_time
}

async function acceptRequest() {
  if (!accepting.value) return
  actionBusy.value = true
  try {
    const res = await acceptExternalBookingRequest(
      accepting.value.id,
      {
        roomId: Number(acceptForm.roomId),
        date: acceptForm.date,
        startTime: acceptForm.startTime,
        endTime: acceptForm.endTime,
      },
      auth.authHeaders(),
    )
    accepting.value = null
    await Swal.fire({ icon: 'success', title: tr('Booking dibuat', 'Booking created'), text: `Booking #${res.bookingId}` })
    await loadRequests()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal accept pengajuan.', 'Failed to accept request.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    actionBusy.value = false
  }
}

async function rejectRequest(item: ExternalBookingRequest) {
  const res = await Swal.fire({
    title: tr('Alasan penolakan', 'Rejection reason'),
    input: 'textarea',
    inputPlaceholder: tr('Tulis alasan...', 'Write a reason...'),
    showCancelButton: true,
    confirmButtonText: tr('Tolak', 'Reject'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
    inputValidator: (value) => (!value?.trim() ? tr('Alasan wajib diisi.', 'Reason is required.') : undefined),
  })
  if (!res.isConfirmed) return

  actionBusy.value = true
  try {
    await rejectExternalBookingRequest(item.id, { reason: String(res.value || '').trim() }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Pengajuan ditolak', 'Request rejected'), timer: 1000, showConfirmButton: false })
    await loadRequests()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menolak pengajuan.', 'Failed to reject request.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    actionBusy.value = false
  }
}

async function openLetter(item: ExternalBookingRequest) {
  const res = await fetch(`/api/admin/external-booking-requests/${item.id}/letter`, { headers: auth.authHeaders() })
  if (!res.ok) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Gagal membuka surat.', 'Failed to open letter.') })
    return
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

watch(search, () => {
  page.value = 1
  loadRequests()
})

watch(() => acceptForm.startTime, () => {
  if (!endOptions.value.includes(acceptForm.endTime)) {
    acceptForm.endTime = endOptions.value[0] || '09:00'
  }
})

onMounted(async () => {
  await Promise.all([loadRooms(), loadRequests()])
})
</script>
