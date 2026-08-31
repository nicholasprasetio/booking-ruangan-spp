<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Peminjaman Ruangan Saya', 'My Room Bookings') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Pantau status peminjaman Anda per permintaan booking.', 'Track your booking request statuses.') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select v-model="statusFilter" class="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700">
              <option value="all">{{ tr('Semua Status', 'All Statuses') }}</option>
              <option value="pending">{{ tr('Menunggu', 'Pending') }}</option>
              <option value="approved">{{ tr('Disetujui', 'Approved') }}</option>
              <option value="rejected">{{ tr('Ditolak', 'Rejected') }}</option>
              <option value="completed">{{ tr('Selesai', 'Completed') }}</option>
              <option value="canceled">{{ tr('Dibatalkan', 'Canceled') }}</option>
            </select>
            <div class="relative">
              <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="search"
                type="text"
                :placeholder="tr('Cari ruangan / kegiatan...', 'Search room / activity...')"
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
          </div>
        </div>

        <div class="flex items-center gap-3 mb-6">
          <button class="px-4 py-2 rounded-full text-sm font-semibold border transition" :class="tabClass('active')" @click="setTab('active')">
            {{ tr('Aktif', 'Active') }}
          </button>
          <button class="px-4 py-2 rounded-full text-sm font-semibold border transition" :class="tabClass('history')" @click="setTab('history')">
            {{ tr('Riwayat', 'History') }}
          </button>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
          {{ error }}
        </div>

        <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
          {{ tr('Memuat booking Anda...', 'Loading your bookings...') }}
        </div>

        <div v-else class="space-y-4">
          <div v-if="displayBookings.length === 0" class="bg-white rounded-3xl shadow p-10 text-center">
            <Icon name="mdi:calendar-blank" class="text-6xl text-gray-300 mx-auto mb-4" />
            <p class="text-gray-600">
              {{ currentTab === 'active' ? tr('Anda belum memiliki peminjaman aktif.', 'You do not have active bookings yet.') : tr('Belum ada riwayat peminjaman.', 'No booking history yet.') }}
            </p>
          </div>

          <div
            v-for="booking in displayBookings"
            :key="booking.id"
            class="bg-white rounded-3xl shadow-xl p-6 border"
            :class="{
              'border-yellow-200': booking.status === 'pending',
              'border-emerald-200': booking.status === 'approved',
              'border-red-200': booking.status === 'rejected',
              'border-slate-200': booking.status === 'completed' || booking.status === 'canceled',
            }"
          >
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div class="flex-1">
                <div class="flex flex-wrap items-center gap-3 mb-2">
                  <h2 class="text-xl font-bold text-gray-900">
                    {{ booking.room_name || `${tr('Ruangan', 'Room')} #${booking.room_id}` }}
                  </h2>
                  <span
                    class="px-3 py-1 rounded-full text-xs font-semibold"
                    :class="{
                      'bg-yellow-50 text-yellow-800': booking.status === 'pending',
                      'bg-emerald-50 text-emerald-800': booking.status === 'approved',
                      'bg-red-50 text-red-800': booking.status === 'rejected',
                      'bg-slate-100 text-slate-700': booking.status === 'completed' || booking.status === 'canceled',
                    }"
                  >
                    {{ statusLabel(booking.status) }}
                  </span>
                  <span
                    v-if="booking.is_recurring"
                    class="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700"
                  >
                    {{ tr('Berulang', 'Recurring') }}
                  </span>
                </div>

                <div class="space-y-1 text-sm text-gray-600">
                  <div class="flex items-start gap-2">
                    <Icon name="mdi:clock-outline" class="text-indigo-600 mt-0.5" />
                    <span class="flex-1">
                      <strong>{{ tr('Jadwal', 'Schedule') }}:</strong>
                      <span class="ml-1">{{ formatBookingSchedule(booking) }}</span>
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:counter" class="text-gray-500" />
                    <span>
                      <strong>{{ tr('Total Peminjaman', 'Total Bookings') }}:</strong>
                      {{ booking.occurrence_total || 0 }}
                      <span class="ml-2 text-xs text-gray-500">
                        ({{ tr('Menunggu', 'Pending') }}: {{ booking.occurrence_pending || 0 }}, {{ tr('Disetujui', 'Approved') }}: {{ booking.occurrence_approved || 0 }}, {{ tr('Ditolak', 'Rejected') }}: {{ booking.occurrence_rejected || 0 }})
                      </span>
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:clock-outline" class="text-gray-500" />
                    <span>
                      <strong>{{ tr('Request', 'Request') }}:</strong> {{ formatDateTime(booking.created_at) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <NuxtLink
                  :to="`/bookings/${booking.id}`"
                  class="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition"
                >
                  {{ tr('Lihat Detail', 'View Details') }}
                </NuxtLink>
                <button
                  v-if="currentTab === 'active' && canReschedule(booking)"
                  class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                  :disabled="loading"
                  @click="askRescheduleScope(booking)"
                >
                  Reschedule
                </button>
                <button
                  v-if="currentTab === 'active' && canCancel(booking)"
                  class="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition shadow-sm"
                  :disabled="loading"
                  @click="askCancelScope(booking)"
                >
                  {{ tr('Batalkan', 'Cancel') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <Pagination :meta="currentMeta" @change="onPageChange" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import type { Booking, BookingOccurrence } from '~/models/booking'
import type { PaginationMeta } from '~/models/pagination'
import { cancelBooking, cancelBookingSeries, fetchBookingById, fetchUserBookingHistory, fetchUserBookings } from '~/services/bookings'

const auth = useAuth()
const { tr, localeTag } = useAppLocale()
auth.loadFromStorage()

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)

const currentTab = ref<'active' | 'history'>('active')
const statusFilter = ref<string>('all')
const search = ref<string>('')

const activeBookings = ref<Booking[]>([])
const historyBookings = ref<Booking[]>([])

const activePage = ref(1)
const historyPage = ref(1)
const pageSize = 10

const activeMeta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })
const historyMeta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })

const currentBookings = computed(() => (currentTab.value === 'history' ? historyBookings.value : activeBookings.value))
const currentMeta = computed(() => (currentTab.value === 'history' ? historyMeta.value : activeMeta.value))

const displayBookings = computed(() => {
  return [...(currentBookings.value || [])].sort((a, b) => {
    const ad = a.created_at || ''
    const bd = b.created_at || ''
    return bd.localeCompare(ad)
  })
})

function setTab(tab: 'active' | 'history') {
  currentTab.value = tab
  router.push({ path: '/user/bookings', query: tab === 'history' ? { tab } : {} })
}

function tabClass(tab: 'active' | 'history') {
  return currentTab.value === tab
    ? 'bg-indigo-600 text-white border-indigo-600'
    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
}

async function fetchActive() {
  const res = await fetchUserBookings(buildQuery(activePage.value, pageSize, search.value, statusFilter.value), auth.authHeaders())
  activeBookings.value = res.data || []
  activeMeta.value = res.meta
}

async function fetchHistory() {
  const res = await fetchUserBookingHistory(buildQuery(historyPage.value, pageSize, search.value, statusFilter.value), auth.authHeaders())
  historyBookings.value = res.data || []
  historyMeta.value = res.meta
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    if (currentTab.value === 'history') {
      await fetchHistory()
    } else {
      await fetchActive()
    }
  } catch (err: any) {
    error.value = err?.data?.error || err?.message || tr('Gagal memuat peminjaman.', 'Failed to load bookings.')
    console.error('Error fetching bookings:', err)
  } finally {
    loading.value = false
  }
}

function onPageChange(page: number) {
  if (currentTab.value === 'history') {
    historyPage.value = page
  } else {
    activePage.value = page
  }
  refresh()
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: tr('Menunggu', 'Pending'),
    approved: tr('Disetujui', 'Approved'),
    rejected: tr('Ditolak', 'Rejected'),
    completed: tr('Selesai', 'Completed'),
    canceled: tr('Dibatalkan', 'Canceled'),
  }
  return labels[status] || status
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString(localeTag.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function bookingOccurrence(booking: Booking): BookingOccurrence | null {
  return booking.next_occurrence || booking.preview_occurrence || null
}

function formatOccurrenceSlots(occurrence: BookingOccurrence | null): string {
  if (!occurrence) return '-'
  const slots = occurrence.slots || []
  if (!slots.length) {
    return `${formatDateTime(occurrence.start_at)} - ${formatDateTime(occurrence.end_at)}`
  }

  const groups = new Map<string, string[]>()
  for (const s of slots) {
    const start = new Date(s.start_at)
    const end = new Date(s.end_at)
    const dateKey = start.toLocaleDateString(localeTag.value, { year: 'numeric', month: 'short', day: 'numeric' })
    const timeLabel = `${start.toLocaleTimeString(localeTag.value, { hour: '2-digit', minute: '2-digit' })}-${end.toLocaleTimeString(
      localeTag.value,
      { hour: '2-digit', minute: '2-digit' },
    )}`
    const list = groups.get(dateKey) || []
    list.push(timeLabel)
    groups.set(dateKey, list)
  }

  const parts = Array.from(groups.entries()).map(([dateKey, ranges]) => {
    const uniq = Array.from(new Set(ranges))
    return `${dateKey}: ${uniq.join(', ')}`
  })

  return parts.join(' • ')
}

function formatBookingSchedule(booking: Booking): string {
  return formatOccurrenceSlots(bookingOccurrence(booking))
}

function isOccurrencePast(occurrence: BookingOccurrence | null): boolean {
  if (!occurrence?.end_at) return false
  const endMs = new Date(occurrence.end_at).getTime()
  if (Number.isNaN(endMs)) return false
  return endMs < Date.now()
}

function canCancel(booking: Booking): boolean {
  const occ = bookingOccurrence(booking)
  if (!occ) return false
  return (occ.status === 'pending' || occ.status === 'approved') && !isOccurrencePast(occ)
}

function canReschedule(booking: Booking): boolean {
  const occ = bookingOccurrence(booking)
  if (!occ) return false
  return (occ.status === 'pending' || occ.status === 'approved' || occ.status === 'rejected') && !isOccurrencePast(occ)
}

function goRescheduleOne(booking: Booking) {
  const occ = bookingOccurrence(booking)
  router.push({
    path: `/user/book-room/request/${booking.room_id}`,
    query: {
      reschedule: String(booking.id),
      ...(occ ? { occurrence: String(occ.id) } : {}),
    },
  })
}

function goRescheduleAll(booking: Booking) {
  router.push({
    path: `/user/book-room/request/${booking.room_id}`,
    query: { rescheduleSeries: String(booking.id) },
  })
}

async function askRescheduleScope(booking: Booking) {
  if (!booking.is_recurring) {
    goRescheduleOne(booking)
    return
  }

  const res = await Swal.fire({
    title: tr('Reschedule booking berulang', 'Reschedule recurring booking'),
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: tr('Hanya 1 peminjaman', 'Only 1 booking'),
    denyButtonText: tr('Semua peminjaman', 'All bookings'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })

  if (res.isConfirmed) {
    goRescheduleOne(booking)
  } else if (res.isDenied) {
    goRescheduleAll(booking)
  }
}

async function cancelOccurrence(booking: Booking) {
  const occ = await chooseCancelableOccurrence(booking)
  if (!occ) return

  const res = await Swal.fire({
    title: tr(`Batalkan: ${formatOccurrenceSlots(occ)}?`, `Cancel: ${formatOccurrenceSlots(occ)}?`),
    input: 'textarea',
    inputPlaceholder: tr('Alasan (opsional)', 'Reason (optional)'),
    showCancelButton: true,
    confirmButtonText: tr('Ya, batalkan', 'Yes, cancel it'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
  })

  if (!res.isConfirmed) return

  loading.value = true
  try {
    await cancelBooking(
      booking.id,
      {
        occurrenceId: occ.id,
        scope: 'occurrence',
        reason: typeof res.value === 'string' ? res.value.trim() : '',
      },
      auth.authHeaders(),
    )
    await Swal.fire({ icon: 'success', title: tr('Dibatalkan', 'Canceled'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal membatalkan booking.', 'Failed to cancel booking.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    loading.value = false
  }
}

async function cancelAllRecurring(booking: Booking) {
  const res = await Swal.fire({
    title: tr('Batalkan semua sisa peminjaman berulang?', 'Cancel all remaining recurring bookings?'),
    input: 'textarea',
    inputPlaceholder: tr('Alasan (opsional)', 'Reason (optional)'),
    showCancelButton: true,
    confirmButtonText: tr('Ya, batalkan semua', 'Yes, cancel all'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
  })

  if (!res.isConfirmed) return

  loading.value = true
  try {
    await cancelBookingSeries(booking.id, { reason: typeof res.value === 'string' ? res.value.trim() : '' }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Dibatalkan', 'Canceled'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal membatalkan booking berulang.', 'Failed to cancel recurring booking.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    loading.value = false
  }
}

async function askCancelScope(booking: Booking) {
  if (!booking.is_recurring) {
    await cancelOccurrence(booking)
    return
  }

  const res = await Swal.fire({
    title: tr('Batalkan booking berulang', 'Cancel recurring booking'),
    text: tr('Pilih tanggal tertentu atau batalkan semua sisa peminjaman.', 'Choose a specific date or cancel all remaining bookings.'),
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: tr('Pilih tanggal satuan', 'Choose one date'),
    denyButtonText: tr('Semua sisa peminjaman', 'All remaining bookings'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
  })

  if (res.isConfirmed) {
    await cancelOccurrence(booking)
  } else if (res.isDenied) {
    await cancelAllRecurring(booking)
  }
}

async function chooseCancelableOccurrence(booking: Booking): Promise<BookingOccurrence | null> {
  if (!booking.is_recurring) return bookingOccurrence(booking)

  try {
    const res = await fetchBookingById(booking.id, auth.authHeaders())
    const options = (res.booking.occurrences || []).filter((occ) => {
      return (occ.status === 'pending' || occ.status === 'approved') && !isOccurrencePast(occ)
    })
    if (!options.length) return null

    const inputOptions = Object.fromEntries(options.map((occ) => [String(occ.id), formatOccurrenceSlots(occ)]))
    const selected = await Swal.fire({
      title: tr('Pilih tanggal yang dibatalkan', 'Choose the date to cancel'),
      input: 'select',
      inputOptions,
      inputValue: String(bookingOccurrence(booking)?.id || options[0]!.id),
      showCancelButton: true,
      confirmButtonText: tr('Lanjutkan', 'Continue'),
      cancelButtonText: tr('Batal', 'Cancel'),
      confirmButtonColor: '#dc2626',
    })

    if (!selected.isConfirmed || !selected.value) return null
    return options.find((occ) => Number(occ.id) === Number(selected.value)) || null
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat detail booking.', 'Failed to load booking details.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    return null
  }
}

watchEffect(() => {
  currentTab.value = route.query.tab === 'history' ? 'history' : 'active'
})

watch([currentTab], () => {
  if (currentTab.value === 'history') {
    historyPage.value = 1
  } else {
    activePage.value = 1
  }
  refresh()
})

watch([statusFilter, search], () => {
  if (currentTab.value === 'history') {
    historyPage.value = 1
  } else {
    activePage.value = 1
  }
  refresh()
})

onMounted(() => {
  refresh()
})
</script>
