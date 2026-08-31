<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto">
        <div class="bg-white rounded-3xl shadow-xl p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ tr('Detail Peminjaman', 'Booking Details') }}</h1>
              <p class="text-sm text-gray-600 mt-1">{{ tr('Booking ID', 'Booking ID') }}: {{ bookingId }}</p>
            </div>
            <NuxtLink to="/user/bookings" class="text-sm font-semibold text-indigo-600 hover:underline">
              {{ tr('Kembali', 'Back') }}
            </NuxtLink>
          </div>

          <div v-if="error" class="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
            {{ error }}
          </div>

          <div v-if="loading" class="mt-6 text-gray-600">{{ tr('Memuat data booking...', 'Loading booking data...') }}</div>

          <div v-else-if="booking" class="mt-6 space-y-5">
            <div class="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm text-gray-600">{{ tr('Ruangan', 'Room') }}</div>
                  <div class="text-lg font-bold text-gray-900">
                    {{ booking.room_name || `${tr('Ruangan', 'Room')} #${booking.room_id}` }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    v-if="booking.is_recurring"
                    class="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700"
                  >
                    {{ tr('Berulang', 'Recurring') }}
                  </span>
                  <div
                    class="px-3 py-1 rounded-full text-xs font-semibold"
                    :class="statusPillClass(booking.status)"
                  >
                    {{ statusLabel(booking.status) }}
                  </div>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div class="text-gray-600">{{ tr('Nama Kegiatan', 'Activity Name') }}</div>
                  <div class="font-semibold text-gray-900">{{ booking.activity_name || '-' }}</div>
                </div>
                <div>
                  <div class="text-gray-600">{{ tr('Estimasi Peserta', 'Estimated Participants') }}</div>
                  <div class="font-semibold text-gray-900">
                    {{ booking.participant_count ? `${booking.participant_count} ${tr('orang', 'people')}` : '-' }}
                  </div>
                </div>
              </div>

              <div class="mt-4 text-sm">
                <div class="text-gray-600">{{ tr('Catatan', 'Notes') }}</div>
                <div class="font-semibold text-gray-900">{{ booking.notes || '-' }}</div>
              </div>

              <div v-if="booking.request_letter_object_key" class="mt-4 text-sm">
                <div class="text-gray-600">{{ tr('Surat Pengajuan', 'Request Letter') }}</div>
                <button
                  class="mt-1 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-50 text-violet-700 font-semibold hover:bg-violet-100 transition"
                  @click="openRequestLetter"
                >
                  <Icon name="mdi:file-pdf-box" size="18" />
                  {{ booking.request_letter_file_name || tr('Buka Surat', 'Open Letter') }}
                </button>
              </div>

              <div class="mt-4 text-sm text-gray-700">
                {{ tr('Total peminjaman', 'Total bookings') }}: {{ booking.occurrence_total || 0 }}
                <span class="text-xs text-gray-500 ml-2">
                  ({{ tr('Menunggu', 'Pending') }}: {{ booking.occurrence_pending || 0 }}, {{ tr('Disetujui', 'Approved') }}: {{ booking.occurrence_approved || 0 }}, {{ tr('Ditolak', 'Rejected') }}: {{ booking.occurrence_rejected || 0 }})
                </span>
              </div>
            </div>

            <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ tr('Pemesan', 'Requester') }}</div>
              <div class="mt-2 space-y-2 text-sm text-gray-700">
                <div class="flex items-center gap-2">
                  <Icon name="mdi:account" class="text-gray-400" />
                  <span>{{ booking.user_name || tr('Pengguna', 'User') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Icon name="mdi:email-outline" class="text-gray-400" />
                  <span>{{ booking.user_email || '-' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Icon name="mdi:phone-outline" class="text-gray-400" />
                  <span>{{ booking.user_phone || '-' }}</span>
                </div>
              </div>
            </div>

            <div v-if="canAct(booking)" class="flex flex-wrap items-center gap-3">
              <button
                class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm"
                :disabled="loading"
                @click="refresh"
              >
                {{ tr('Perbarui Status', 'Refresh Status') }}
              </button>
              <button
                v-if="booking.is_recurring && canRescheduleAll(booking)"
                class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                :disabled="loading"
                @click="goRescheduleAll(booking)"
              >
                {{ tr('Reschedule Semua', 'Reschedule All') }}
              </button>
              <button
                v-if="booking.is_recurring && canCancelAll(booking)"
                class="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition shadow-sm"
                :disabled="loading"
                @click="cancelAllRemaining(booking)"
              >
                {{ tr('Batalkan Semua Sisa', 'Cancel All Remaining') }}
              </button>
              <button
                v-if="!booking.is_recurring && singleRescheduleOccurrence(booking)"
                class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                :disabled="loading"
                @click="goSingleReschedule(booking)"
              >
                {{ tr('Reschedule', 'Reschedule') }}
              </button>
              <button
                v-if="!booking.is_recurring && singleCancelOccurrence(booking)"
                class="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition shadow-sm"
                :disabled="loading"
                @click="cancelSingleBooking(booking)"
              >
                {{ tr('Batalkan', 'Cancel') }}
              </button>
            </div>

            <div class="rounded-2xl border border-gray-100 overflow-hidden">
              <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-700">
                {{ tr('Detail Peminjaman', 'Booking Details') }}
              </div>
              <div v-if="isAdmin && selectedOccurrenceIds.length" class="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center gap-2">
                <span class="text-sm font-semibold text-indigo-900">{{ selectedOccurrenceIds.length }} sesi dipilih</span>
                <button class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold" @click="bulkOccurrenceAction('approve')">{{ tr('Setujui', 'Approve') }}</button>
                <button class="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold" @click="bulkOccurrenceAction('reject')">{{ tr('Tolak', 'Reject') }}</button>
                <button class="px-3 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold" @click="bulkOccurrenceAction('cancel')">{{ tr('Batalkan', 'Cancel') }}</button>
                <button class="px-3 py-2 rounded-xl bg-white text-slate-700 text-sm font-semibold" @click="selectedOccurrences = {}">Clear</button>
              </div>
              <div class="divide-y divide-gray-100">
                <div v-for="occ in booking.occurrences || []" :key="occ.id" class="p-4 text-sm">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-3">
                      <input
                        v-if="isAdmin"
                        type="checkbox"
                        class="h-5 w-5 rounded border-gray-300"
                        :checked="selectedOccurrences[occ.id] === true"
                        @change="selectedOccurrences = { ...selectedOccurrences, [occ.id]: !selectedOccurrences[occ.id] }"
                      />
                      <div class="font-semibold text-gray-900">{{ formatOccurrenceSchedule(occ) }}</div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span v-if="isOccurrencePast(occ)" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                        {{ tr('Sudah lewat', 'Past') }}
                      </span>
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="statusPillClass(occ.status)">
                        {{ statusLabel(occ.status) }}
                      </span>
                    </div>
                  </div>
                  <div v-if="occ.status === 'rejected' && occ.rejection_reason" class="mt-1 text-xs text-red-700">
                    {{ tr('Alasan ditolak', 'Rejection reason') }}: {{ occ.rejection_reason }}
                  </div>
                  <div v-if="occ.status === 'canceled' && occ.cancel_reason" class="mt-1 text-xs text-slate-600">
                    {{ tr('Alasan batal', 'Cancellation reason') }}: {{ occ.cancel_reason }}
                  </div>
                  <div v-if="canRescheduleOccurrence(occ) || canCancelOccurrence(occ) || occ.status === 'approved'" class="mt-3 flex flex-wrap gap-2 justify-end">
                    <template v-if="isAdmin">
                      <button
                        v-if="occ.status === 'pending'"
                        class="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                        :disabled="loading"
                        @click="adminOccurrenceAction('approve', occ)"
                      >
                        {{ tr('Setujui', 'Approve') }}
                      </button>
                      <button
                        v-if="occ.status === 'pending'"
                        class="px-3 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                        :disabled="loading"
                        @click="adminOccurrenceAction('reject', occ)"
                      >
                        {{ tr('Tolak', 'Reject') }}
                      </button>
                      <button
                        v-if="occ.status === 'approved' || occ.status === 'rejected'"
                        class="px-3 py-2 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-800 transition"
                        :disabled="loading"
                        @click="adminOccurrenceAction('cancel', occ)"
                      >
                        {{ tr('Batalkan', 'Cancel') }}
                      </button>
                      <button
                        class="px-3 py-2 rounded-xl bg-sky-50 text-sky-700 font-semibold hover:bg-sky-100 transition"
                        :disabled="loading"
                        @click="changeOccurrenceRoom(occ)"
                      >
                        {{ tr('Ganti Ruangan', 'Change Room') }}
                      </button>
                    </template>
                    <button
                      v-if="occ.status === 'approved'"
                      class="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition"
                      :disabled="loading"
                      @click="showKeyQr(occ)"
                    >
                      <Icon name="mdi:qrcode" class="mr-1" />
                      QR Kunci
                    </button>
                    <button
                      v-if="!isAdmin && canRescheduleOccurrence(occ)"
                      class="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                      :disabled="loading"
                      @click="goRescheduleOccurrence(booking, occ)"
                    >
                      {{ tr('Reschedule', 'Reschedule') }}
                    </button>
                    <button
                      v-if="!isAdmin && canCancelOccurrence(occ)"
                      class="px-3 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                      :disabled="loading"
                      @click="cancelSingleOccurrence(booking, occ)"
                    >
                      {{ tr('Batalkan', 'Cancel') }}
                    </button>
                  </div>
                </div>
                <div v-if="!(booking.occurrences && booking.occurrences.length)" class="p-4 text-sm text-gray-500">
                  {{ tr('Belum ada peminjaman.', 'No bookings yet.') }}
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-gray-100 overflow-hidden">
              <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-700">
                {{ tr('Riwayat', 'History') }}
              </div>
              <div class="divide-y divide-gray-100">
                <div v-for="event in booking.events || []" :key="event.id" class="p-4 text-sm">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="font-semibold text-gray-900">{{ eventTitle(event) }}</div>
                      <div class="text-xs text-gray-500 mt-0.5">
                        {{ formatDateTime(event.created_at) }}
                        <span v-if="event.actor_name"> - {{ event.actor_name }}</span>
                        <span v-else-if="event.actor_email"> - {{ event.actor_email }}</span>
                      </div>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                      {{ event.type }}
                    </span>
                  </div>
                  <div v-if="eventDescription(event)" class="mt-2 text-xs text-gray-600 whitespace-pre-line">
                    {{ eventDescription(event) }}
                  </div>
                </div>
                <div v-if="!(booking.events && booking.events.length)" class="p-4 text-sm text-gray-500">
                  {{ tr('Belum ada riwayat.', 'No history yet.') }}
                </div>
              </div>
            </div>
          </div>

          <div v-else class="mt-6 text-gray-600">{{ tr('Peminjaman tidak ditemukan.', 'Booking not found.') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import type { Booking, BookingOccurrence } from '~/models/booking'
import { cancelBooking, cancelBookingSeries, fetchBookingById } from '~/services/bookings'
import { bulkAdminBookingAction, changeAdminBookingOccurrenceRoom } from '~/services/adminBookings'
import { fetchAdminRooms } from '~/services/adminRooms'

const auth = useAuth()
const { tr, localeTag } = useAppLocale()
auth.loadFromStorage()

const route = useRoute()
const bookingId = Number(route.params.id)

const loading = ref(false)
const error = ref<string | null>(null)
const booking = ref<Booking | null>(null)
const currentUser = ref<any | null>(null)
const selectedOccurrences = ref<Record<number, boolean>>({})
const adminRooms = ref<{ id: number; name: string }[]>([])

const isAdmin = computed(() => {
  const roles = currentUser.value?.role_names || currentUser.value?.roles || []
  return Array.isArray(roles) && roles.includes('admin')
})
const selectedOccurrenceIds = computed(() => Object.keys(selectedOccurrences.value).filter((id) => selectedOccurrences.value[Number(id)]).map(Number))

type BookingEvent = NonNullable<Booking['events']>[number]
type EventPayload = Record<string, any>

function isOccurrencePast(occurrence: BookingOccurrence): boolean {
  const end = new Date(occurrence.end_at || '').getTime()
  return Number.isFinite(end) && end < Date.now()
}

function canCancelOccurrence(occurrence: BookingOccurrence): boolean {
  return !isOccurrencePast(occurrence) && (occurrence.status === 'pending' || occurrence.status === 'approved')
}

function canRescheduleOccurrence(occurrence: BookingOccurrence): boolean {
  return !isOccurrencePast(occurrence) && (occurrence.status === 'pending' || occurrence.status === 'approved' || occurrence.status === 'rejected')
}

function nextActionableOccurrence(b: Booking): BookingOccurrence | null {
  return (b.occurrences || []).find((o) => canCancelOccurrence(o) || canRescheduleOccurrence(o)) || null
}

function cancelableOccurrences(b: Booking): BookingOccurrence[] {
  return (b.occurrences || []).filter(canCancelOccurrence)
}

function reschedulableOccurrences(b: Booking): BookingOccurrence[] {
  return (b.occurrences || []).filter(canRescheduleOccurrence)
}

function singleCancelOccurrence(b: Booking): BookingOccurrence | null {
  return cancelableOccurrences(b)[0] || null
}

function singleRescheduleOccurrence(b: Booking): BookingOccurrence | null {
  return reschedulableOccurrences(b)[0] || null
}

function canCancelAll(b: Booking): boolean {
  return cancelableOccurrences(b).length > 0
}

function canRescheduleAll(b: Booking): boolean {
  return reschedulableOccurrences(b).length > 0
}

function canAct(b: Booking): boolean {
  return Boolean(canCancelAll(b) || canRescheduleAll(b) || singleCancelOccurrence(b) || singleRescheduleOccurrence(b))
}

function statusLabel(s: string | null) {
  if (s === 'approved') return tr('Disetujui', 'Approved')
  if (s === 'rejected') return tr('Ditolak', 'Rejected')
  if (s === 'canceled') return tr('Dibatalkan', 'Canceled')
  if (s === 'completed') return tr('Selesai', 'Completed')
  return tr('Menunggu', 'Pending')
}

function statusPillClass(s: string | null) {
  if (s === 'approved') return 'bg-emerald-50 text-emerald-800'
  if (s === 'rejected') return 'bg-red-50 text-red-700'
  if (s === 'canceled') return 'bg-slate-100 text-slate-700'
  if (s === 'completed') return 'bg-slate-100 text-slate-700'
  return 'bg-yellow-50 text-yellow-800'
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString(localeTag.value, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatOccurrenceSchedule(occurrence: BookingOccurrence): string {
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

  return Array.from(groups.entries()).map(([dateKey, ranges]) => `${dateKey}: ${Array.from(new Set(ranges)).join(', ')}`).join(' | ')
}

async function goRescheduleOccurrence(b: Booking, occ: BookingOccurrence) {
  if (!canRescheduleOccurrence(occ)) return
  await navigateTo(`/user/book-room/request/${b.room_id}?reschedule=${b.id}&occurrence=${occ.id}`)
}

async function goSingleReschedule(b: Booking) {
  const occ = singleRescheduleOccurrence(b)
  if (!occ) return
  await goRescheduleOccurrence(b, occ)
}

async function goRescheduleAll(b: Booking) {
  if (!canRescheduleAll(b)) return
  await navigateTo(`/user/book-room/request/${b.room_id}?rescheduleSeries=${b.id}`)
}

async function cancelAllRemaining(b: Booking) {
  if (!canCancelAll(b)) return
  const res = await Swal.fire({
    title: tr('Batalkan semua sisa peminjaman?', 'Cancel all remaining bookings?'),
    text: tr('Hanya tanggal mendatang yang menunggu/disetujui yang akan dibatalkan.', 'Only future pending/approved dates will be canceled.'),
    input: 'textarea',
    inputPlaceholder: tr('Alasan (opsional)', 'Reason (optional)'),
    showCancelButton: true,
    confirmButtonText: tr('Batalkan semua sisa', 'Cancel remaining'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
  })
  if (!res.isConfirmed) return

  loading.value = true
  try {
    await cancelBookingSeries(b.id, { reason: typeof res.value === 'string' ? res.value.trim() : '' }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Dibatalkan', 'Canceled'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal membatalkan booking berulang.', 'Failed to cancel recurring booking.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    loading.value = false
  }
}

async function cancelSingleBooking(b: Booking) {
  const occ = singleCancelOccurrence(b)
  if (!occ) return
  await cancelSingleOccurrence(b, occ)
}

async function cancelSingleOccurrence(b: Booking, occ: BookingOccurrence) {
  if (!canCancelOccurrence(occ)) return
  const res = await Swal.fire({
    title: tr(`Batalkan: ${formatOccurrenceSchedule(occ)}?`, `Cancel: ${formatOccurrenceSchedule(occ)}?`),
    input: 'textarea',
    inputPlaceholder: tr('Alasan (opsional)', 'Reason (optional)'),
    showCancelButton: true,
    confirmButtonText: tr('Batalkan', 'Cancel'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
  })
  if (!res.isConfirmed) return

  loading.value = true
  try {
    await cancelBooking(
      b.id,
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

async function loadCurrentUser() {
  try {
    const data: any = await $fetch('/api/auth/me', { headers: auth.authHeaders() })
    currentUser.value = data.user
  } catch {
    currentUser.value = null
  }
}

async function loadAdminRooms() {
  if (adminRooms.value.length) return
  const res = await fetchAdminRooms({ page: 1, pageSize: 100 }, auth.authHeaders())
  adminRooms.value = (res.data || [])
    .filter((room: any) => room.available_for_booking !== false && room.available_for_booking !== 0)
    .map((room: any) => ({ id: room.id, name: room.name }))
}

async function adminOccurrenceAction(action: 'approve' | 'reject' | 'cancel', occ: BookingOccurrence) {
  if (!booking.value) return
  let reason = ''
  if (action !== 'approve') {
    const res = await Swal.fire({
      title: action === 'reject' ? tr('Alasan penolakan', 'Rejection reason') : tr('Alasan pembatalan', 'Cancellation reason'),
      input: 'textarea',
      inputPlaceholder: tr('Tulis alasan...', 'Write reason...'),
      showCancelButton: true,
      confirmButtonText: action === 'reject' ? tr('Tolak', 'Reject') : tr('Batalkan', 'Cancel'),
      cancelButtonText: tr('Batal', 'Cancel'),
      preConfirm: (value) => {
        if (action === 'reject' && (!value || !String(value).trim())) Swal.showValidationMessage(tr('Alasan penolakan wajib diisi.', 'Rejection reason is required.'))
        return value
      },
    })
    if (!res.isConfirmed) return
    reason = typeof res.value === 'string' ? res.value.trim() : ''
  }

  loading.value = true
  try {
    await bulkAdminBookingAction({ action, items: [{ bookingId: booking.value.id, occurrenceId: occ.id, scope: 'occurrence' }], reason }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Berhasil', 'Success'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Aksi gagal.', 'Action failed.') })
  } finally {
    loading.value = false
  }
}

async function bulkOccurrenceAction(action: 'approve' | 'reject' | 'cancel') {
  if (!booking.value || !selectedOccurrenceIds.value.length) return
  let reason = ''
  if (action !== 'approve') {
    const res = await Swal.fire({
      title: action === 'reject' ? tr('Alasan penolakan', 'Rejection reason') : tr('Alasan pembatalan', 'Cancellation reason'),
      input: 'textarea',
      inputPlaceholder: tr('Tulis alasan...', 'Write reason...'),
      showCancelButton: true,
      confirmButtonText: action === 'reject' ? tr('Tolak', 'Reject') : tr('Batalkan', 'Cancel'),
      cancelButtonText: tr('Batal', 'Cancel'),
      preConfirm: (value) => {
        if (action === 'reject' && (!value || !String(value).trim())) Swal.showValidationMessage(tr('Alasan penolakan wajib diisi.', 'Rejection reason is required.'))
        return value
      },
    })
    if (!res.isConfirmed) return
    reason = typeof res.value === 'string' ? res.value.trim() : ''
  }

  loading.value = true
  try {
    await bulkAdminBookingAction({
      action,
      items: selectedOccurrenceIds.value.map((occurrenceId) => ({ bookingId: booking.value!.id, occurrenceId, scope: 'occurrence' })),
      reason,
    }, auth.authHeaders())
    selectedOccurrences.value = {}
    await Swal.fire({ icon: 'success', title: tr('Berhasil', 'Success'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Bulk action gagal.', 'Bulk action failed.') })
  } finally {
    loading.value = false
  }
}

async function changeOccurrenceRoom(occ: BookingOccurrence) {
  if (!booking.value) return
  await loadAdminRooms()
  const options = Object.fromEntries(adminRooms.value.map((room) => [String(room.id), room.name]))
  const res = await Swal.fire({
    title: tr('Ganti ruangan sesi', 'Change occurrence room'),
    input: 'select',
    inputOptions: options,
    showCancelButton: true,
    confirmButtonText: tr('Ganti Ruangan', 'Change Room'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })
  if (!res.isConfirmed || !res.value) return

  loading.value = true
  try {
    await changeAdminBookingOccurrenceRoom(booking.value.id, occ.id, { roomId: Number(res.value) }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Ruangan diperbarui', 'Room updated'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Gagal mengganti ruangan.', 'Failed to change room.') })
  } finally {
    loading.value = false
  }
}

async function showKeyQr(occ: BookingOccurrence) {
  if (!booking.value) return
  try {
    const res: any = await $fetch(`/api/bookings/${booking.value.id}/occurrences/${occ.id}/qr`, {
      headers: auth.authHeaders(),
    })
    await Swal.fire({
      title: tr('QR Kunci Ruangan', 'Room Key QR'),
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <img src="${res.qrImageUrl}" alt="QR Kunci" style="width:260px;height:260px;border:1px solid #e5e7eb;border-radius:12px" />
          <div style="font-size:12px;color:#6b7280;word-break:break-all">${res.scanUrl}</div>
        </div>
      `,
      confirmButtonText: tr('Tutup', 'Close'),
    })
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('QR belum tersedia.', 'QR is not available.') })
  }
}

function parseEventPayload(event: BookingEvent): EventPayload | null {
  if (!event.payload) return null
  try {
    const parsed = JSON.parse(event.payload)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function eventTitle(event: BookingEvent): string {
  if (event.type === 'created') return tr('Peminjaman dibuat', 'Booking created')
  if (event.type === 'approved') return tr('Peminjaman disetujui', 'Booking approved')
  if (event.type === 'rejected') return tr('Peminjaman ditolak', 'Booking rejected')
  if (event.type === 'canceled') return tr('Peminjaman dibatalkan', 'Booking canceled')
  if (event.type === 'rescheduled') return tr('Peminjaman di-reschedule', 'Booking rescheduled')
  if (event.type === 'rescheduled_all') return tr('Semua sisa peminjaman di-reschedule', 'Remaining bookings rescheduled')
  if (event.type === 'room_changed') return tr('Ruangan diganti', 'Room changed')
  return event.type
}

function formatSlotList(slots: Array<{ start_at?: string; end_at?: string }> | null | undefined): string {
  if (!Array.isArray(slots) || !slots.length) return ''
  return slots
    .filter((slot) => slot.start_at && slot.end_at)
    .map((slot) => `${formatDateTime(slot.start_at || null)} - ${formatDateTime(slot.end_at || null)}`)
    .join('\n')
}

function formatOccurrenceList(items: any[] | null | undefined): string {
  if (!Array.isArray(items) || !items.length) return ''
  const visible = items.slice(0, 5)
  const lines = visible
    .map((item) => {
      const slotText = formatSlotList(item?.slots)
      if (slotText) return slotText
      if (item?.start_at && item?.end_at) return `${formatDateTime(item.start_at)} - ${formatDateTime(item.end_at)}`
      return ''
    })
    .filter(Boolean)

  if (items.length > visible.length) {
    lines.push(tr(`+${items.length - visible.length} lainnya`, `+${items.length - visible.length} more`))
  }

  return lines.join('\n')
}

function eventDescription(event: BookingEvent): string {
  const payload = parseEventPayload(event)
  if (!payload) return ''

  if (event.type === 'rescheduled') {
    const before = formatSlotList(payload.old_slots || payload.from) || (payload.old_start_at && payload.old_end_at ? `${formatDateTime(payload.old_start_at)} - ${formatDateTime(payload.old_end_at)}` : '')
    const after = formatSlotList(payload.new_slots || payload.to) || (payload.new_start_at && payload.new_end_at ? `${formatDateTime(payload.new_start_at)} - ${formatDateTime(payload.new_end_at)}` : '')
    return [
      before ? `${tr('Dari', 'From')}:\n${before}` : '',
      after ? `${tr('Menjadi', 'To')}:\n${after}` : '',
      payload.reason ? `${tr('Alasan', 'Reason')}: ${payload.reason}` : '',
    ].filter(Boolean).join('\n\n')
  }

  if (event.type === 'rescheduled_all') {
    const before = formatOccurrenceList(payload.replaced_occurrences)
    const after = formatOccurrenceList(payload.new_occurrences)
    const fallback = payload.occurrences ? tr(`${payload.occurrences} peminjaman dibuat ulang.`, `${payload.occurrences} bookings regenerated.`) : ''
    return [
      before ? `${tr('Sebelumnya', 'Before')}:\n${before}` : '',
      after ? `${tr('Jadwal baru', 'New schedule')}:\n${after}` : fallback,
      payload.reason ? `${tr('Alasan', 'Reason')}: ${payload.reason}` : '',
    ].filter(Boolean).join('\n\n')
  }

  if (event.type === 'canceled' || event.type === 'rejected') {
    return payload.reason ? `${tr('Alasan', 'Reason')}: ${payload.reason}` : ''
  }

  if (event.type === 'room_changed') {
    const fromRoom = payload.old_room_name || payload.from_room_name || payload.old_room_id || payload.from_room_id
    const toRoom = payload.new_room_name || payload.to_room_name || payload.new_room_id || payload.to_room_id
    return [
      fromRoom ? `${tr('Dari', 'From')}: ${fromRoom}` : '',
      toRoom ? `${tr('Ke', 'To')}: ${toRoom}` : '',
    ].filter(Boolean).join('\n')
  }

  return ''
}

async function openRequestLetter() {
  if (!booking.value) return
  try {
    const res = await fetch(`/api/bookings/${booking.value.id}/letter`, { headers: auth.authHeaders() })
    if (!res.ok) throw new Error(tr('Gagal membuka surat.', 'Failed to open letter.'))
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.message || tr('Gagal membuka surat.', 'Failed to open letter.') })
  }
}

async function refresh() {
  if (!bookingId) return
  loading.value = true
  error.value = null
  try {
    const res = await fetchBookingById(bookingId, auth.authHeaders())
    booking.value = res.booking
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat peminjaman.', 'Failed to load booking.')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCurrentUser()
  await refresh()
})
</script>
