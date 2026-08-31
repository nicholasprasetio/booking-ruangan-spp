<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Semua Peminjaman', 'All Bookings') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Kelola persetujuan peminjaman.', 'Manage booking approvals.') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <template v-if="currentTab !== 'report'">
              <div class="relative">
                <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="search"
                  type="text"
                  :placeholder="tr('Cari ruangan / pemesan...', 'Search room / requester...')"
                  class="pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                />
              </div>
              <select
                v-if="currentTab === 'all'"
                v-model="statusFilter"
                class="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"
              >
                <option value="all">{{ tr('Semua Status', 'All Statuses') }}</option>
                <option value="pending">{{ tr('Menunggu', 'Pending') }}</option>
                <option value="approved">{{ tr('Disetujui', 'Approved') }}</option>
                <option value="rejected">{{ tr('Ditolak', 'Rejected') }}</option>
                <option value="completed">{{ tr('Selesai', 'Completed') }}</option>
                <option value="canceled">{{ tr('Dibatalkan', 'Canceled') }}</option>
              </select>
              <button
                class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm"
                :disabled="loading"
                @click="refresh"
              >
                {{ tr('Perbarui', 'Refresh') }}
              </button>
            </template>
          </div>
        </div>

        <div class="flex items-center gap-3 mb-6">
          <button
            class="px-4 py-2 rounded-full text-sm font-semibold border transition"
            :class="tabClass('pending')"
            @click="setTab('pending')"
          >
            {{ tr('Butuh Persetujuan', 'Needs Approval') }}
          </button>
          <button
            class="px-4 py-2 rounded-full text-sm font-semibold border transition"
            :class="tabClass('all')"
            @click="setTab('all')"
          >
            {{ tr('Semua Peminjaman', 'All Bookings') }}
          </button>
          <button
            class="px-4 py-2 rounded-full text-sm font-semibold border transition"
            :class="tabClass('report')"
            @click="setTab('report')"
          >
            <Icon name="mdi:chart-bar" class="mr-1" />
            {{ tr('Laporan', 'Report') }}
          </button>
        </div>

        <div v-if="currentTab === 'report'">
          <div class="bg-white rounded-2xl shadow border border-gray-100 p-4 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ tr('Tanggal Mulai', 'Start Date') }}</label>
                <input v-model="reportStartDate" type="date" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ tr('Tanggal Akhir', 'End Date') }}</label>
                <input v-model="reportEndDate" type="date" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ tr('Status', 'Status') }}</label>
                <select v-model="reportStatus" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm">
                  <option value="">{{ tr('Semua', 'All') }}</option>
                  <option value="pending">{{ tr('Menunggu', 'Pending') }}</option>
                  <option value="approved">{{ tr('Disetujui', 'Approved') }}</option>
                  <option value="rejected">{{ tr('Ditolak', 'Rejected') }}</option>
                  <option value="completed">{{ tr('Selesai', 'Completed') }}</option>
                  <option value="canceled">{{ tr('Dibatalkan', 'Canceled') }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ tr('Ruangan', 'Room') }}</label>
                <select v-model="reportRoomId" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm">
                  <option :value="null">{{ tr('Semua Ruangan', 'All Rooms') }}</option>
                  <option v-for="room in reportRooms" :key="room.id" :value="room.id">{{ room.name }}</option>
                </select>
              </div>
              <div class="flex items-end gap-2">
                <button
                  class="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                  :disabled="reportLoading || !reportStartDate || !reportEndDate"
                  @click="loadReport"
                >
                  {{ reportLoading ? tr('Memuat...', 'Loading...') : tr('Tampilkan', 'Show') }}
                </button>
                <button
                  v-if="reportData.length"
                  class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition inline-flex items-center gap-1"
                  :disabled="reportExporting"
                  @click="handleReportExport"
                >
                  <Icon name="mdi:file-excel" size="16" />
                  {{ reportExporting ? '...' : 'Excel' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="reportSummary" class="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <div class="bg-white rounded-2xl shadow border border-gray-100 p-4 text-center">
              <div class="text-2xl font-bold text-gray-900">{{ reportSummary.total }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ tr('Total', 'Total') }}</div>
            </div>
            <div class="bg-amber-50 rounded-2xl shadow border border-amber-100 p-4 text-center">
              <div class="text-2xl font-bold text-amber-700">{{ reportSummary.pending }}</div>
              <div class="text-xs text-amber-600 mt-1">{{ tr('Menunggu', 'Pending') }}</div>
            </div>
            <div class="bg-emerald-50 rounded-2xl shadow border border-emerald-100 p-4 text-center">
              <div class="text-2xl font-bold text-emerald-700">{{ reportSummary.approved }}</div>
              <div class="text-xs text-emerald-600 mt-1">{{ tr('Disetujui', 'Approved') }}</div>
            </div>
            <div class="bg-red-50 rounded-2xl shadow border border-red-100 p-4 text-center">
              <div class="text-2xl font-bold text-red-700">{{ reportSummary.rejected }}</div>
              <div class="text-xs text-red-600 mt-1">{{ tr('Ditolak', 'Rejected') }}</div>
            </div>
            <div class="bg-slate-50 rounded-2xl shadow border border-slate-200 p-4 text-center">
              <div class="text-2xl font-bold text-slate-700">{{ reportSummary.completed }}</div>
              <div class="text-xs text-slate-500 mt-1">{{ tr('Selesai', 'Completed') }}</div>
            </div>
            <div class="bg-gray-50 rounded-2xl shadow border border-gray-200 p-4 text-center">
              <div class="text-2xl font-bold text-gray-600">{{ reportSummary.canceled }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ tr('Dibatalkan', 'Canceled') }}</div>
            </div>
          </div>

          <div v-if="reportLoading" class="bg-white rounded-2xl shadow p-10 text-center text-gray-600">
            {{ tr('Memuat data report...', 'Loading report data...') }}
          </div>

          <div v-if="reportError" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-4">
            {{ reportError }}
          </div>

          <div v-if="!reportLoading && reportData.length" class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-200">
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Ruangan', 'Room') }}</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Kegiatan', 'Activity') }}</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Peminjam', 'Borrower') }}</th>
                    <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Peserta', 'Participants') }}</th>
                    <th class="px-4 py-3 text-center font-semibold text-gray-700">{{ tr('Status', 'Status') }}</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Jadwal', 'Schedule') }}</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">{{ tr('Tanggal Request', 'Request Date') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(b, idx) in reportData" :key="`${b.id}-${idx}`" class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="px-4 py-3 text-gray-500">{{ idx + 1 }}</td>
                    <td class="px-4 py-3 font-medium">{{ b.room_name || '-' }}</td>
                    <td class="px-4 py-3">{{ b.activity_name || '-' }}</td>
                    <td class="px-4 py-3">
                      <div>{{ b.user_name || '-' }}</div>
                      <div v-if="b.user_email" class="text-xs text-gray-400">{{ b.user_email }}</div>
                    </td>
                    <td class="px-4 py-3 text-center">{{ b.participant_count || '-' }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="badgeClass(b.status)">
                        {{ statusLabel(b.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-xs">{{ formatBookedSlots(b) }}</td>
                    <td class="px-4 py-3 text-xs text-gray-500">{{ formatDateTime(b.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="!reportLoading && !reportData.length && reportSummary" class="bg-white rounded-2xl shadow p-10 text-center text-gray-600">
            {{ tr('Tidak ada data peminjaman pada rentang tanggal ini.', 'No booking data in this date range.') }}
          </div>
        </div>

        <template v-if="currentTab !== 'report'">
          <div v-if="selectedIds.length" class="bg-white rounded-2xl shadow border border-indigo-100 p-4 mb-4 flex flex-wrap items-center gap-3">
            <div class="font-semibold text-gray-800">{{ selectedIds.length }} dipilih</div>
            <button class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold" @click="bulkAction('approve')">Setujui</button>
            <button class="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold" @click="bulkAction('reject')">Tolak</button>
            <button class="px-3 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold" @click="bulkAction('cancel')">Batalkan</button>
            <button class="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold" @click="clearSelection">Clear</button>
          </div>

          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
            {{ error }}
          </div>

          <div v-if="loading" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
            {{ tr('Memuat peminjaman...', 'Loading bookings...') }}
          </div>

          <div v-else class="space-y-4">
            <div v-if="currentBookings.length === 0" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
              {{ tr('Tidak ada data peminjaman.', 'No booking data found.') }}
            </div>

            <div v-for="b in currentBookings" :key="b.id" class="bg-white rounded-3xl shadow-xl p-6 border" :class="borderClass(b.status)">
              <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <input
                  type="checkbox"
                  class="mt-1 h-5 w-5 rounded border-gray-300"
                  :checked="selected[b.id] === true"
                  @change="toggleSelected(b)"
                />
                <div class="flex-1 space-y-4">
                  <div class="flex align-middle justify-between">
                    <div class="flex flex-wrap items-center gap-3">
                      <div class="text-xl font-bold text-gray-900">
                        {{ b.room_name || `Room #${b.room_id}` }}
                      </div>
                      <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="badgeClass(b.status)">
                        {{ statusLabel(b.status) }}
                      </span>
                      <span v-if="b.is_recurring" class="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {{ tr('Berulang', 'Recurring') }}
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-2 items-center justify-end">
                      <NuxtLink
                        :to="`/bookings/${b.id}`"
                        class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition shadow-sm"
                      >
                        {{ tr('Detail', 'Details') }}
                      </NuxtLink>
                      <button
                        class="px-4 py-2 rounded-xl bg-sky-50 text-sky-700 font-semibold hover:bg-sky-100 transition shadow-sm"
                        :disabled="actingId === b.id"
                        @click="changeBookingRoom(b)"
                      >
                        {{ tr('Ganti Ruangan', 'Change Room') }}
                      </button>
                      <button
                        v-if="b.request_letter_object_key"
                        class="px-4 py-2 rounded-xl bg-violet-50 text-violet-700 font-semibold hover:bg-violet-100 transition shadow-sm"
                        @click="openRequestLetter(b)"
                      >
                        {{ tr('Surat', 'Letter') }}
                      </button>
                      <template v-if="currentTab === 'pending' && b.next_pending_occurrence">
                        <button
                          v-if="!b.is_recurring"
                          class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm"
                          :disabled="actingId === b.id"
                          @click="approveOccurrence(b)"
                        >
                          {{ tr('Setujui', 'Approve') }}
                        </button>
                        <button
                          v-if="b.is_recurring || (b.occurrence_pending || 0) > 1"
                          class="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 transition shadow-sm"
                          :disabled="actingId === b.id"
                          @click="approveAll(b)"
                        >
                          {{ tr('Setujui Semua', 'Approve All') }}
                        </button>
                        <button
                          v-if="!b.is_recurring"
                          class="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition shadow-sm"
                          :disabled="actingId === b.id"
                          @click="rejectOccurrence(b)"
                        >
                          {{ tr('Tolak', 'Reject') }}
                        </button>
                        <button
                          v-if="b.is_recurring"
                          class="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition shadow-sm"
                          :disabled="actingId === b.id"
                          @click="rejectAll(b)"
                        >
                          {{ tr('Tolak Semua', 'Reject All') }}
                        </button>
                      </template>
                      <button
                        v-if="currentTab === 'all' && canAdminCancel(b)"
                        class="px-4 py-2 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-800 transition shadow-sm"
                        :disabled="actingId === b.id"
                        @click="cancelAdminBooking(b)"
                      >
                        {{ b.is_recurring ? tr('Batalkan Semua', 'Cancel All') : tr('Batalkan', 'Cancel') }}
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div class="space-y-1 text-gray-600">
                      <div>
                        <span class="font-semibold text-gray-700">{{ tr('Pending Berikutnya:', 'Next Pending:') }}</span>
                        {{ formatNextPendingSlots(b) }}
                      </div>
                      <div>
                        <span class="font-semibold text-gray-700">{{ tr('Permintaan:', 'Request:') }}</span>
                        {{ formatDateTime(b.created_at) }}
                      </div>
                    </div>

                    <div class="space-y-1 text-gray-600">
                      <div>
                        <span class="font-semibold text-gray-700">{{ tr('Nama Kegiatan:', 'Activity Name:') }}</span>
                        {{ b.activity_name || '-' }}
                      </div>
                      <div>
                        <span class="font-semibold text-gray-700">{{ tr('Estimasi Peserta:', 'Estimated Participants:') }}</span>
                        {{ b.participant_count ? `${b.participant_count} ${tr('orang', 'people')}` : '-' }}
                      </div>
                      <div>
                        <span class="font-semibold text-gray-700">{{ tr('Peminjaman Pending:', 'Pending Bookings:') }}</span>
                        {{ b.occurrence_pending || 0 }} / {{ b.occurrence_total || 0 }}
                      </div>
                    </div>
                  </div>

                  <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ tr('Pemesan', 'Requester') }}</div>
                    <div class="mt-2 space-y-2 text-sm text-gray-700">
                      <div class="flex items-center gap-2">
                        <Icon name="mdi:account" class="text-gray-400" />
                        <span>{{ b.user_name || tr('Pengguna', 'User') }}</span>
                      </div>
                      <div v-if="b.user_email" class="flex items-center gap-2">
                        <Icon name="mdi:email-outline" class="text-gray-400" />
                        <span>{{ b.user_email }}</span>
                      </div>
                      <div v-if="b.user_phone" class="flex items-center gap-2">
                        <Icon name="mdi:phone-outline" class="text-gray-400" />
                        <span>{{ b.user_phone }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6">
            <Pagination :meta="currentMeta" @change="onPageChange" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import { useAppLocale } from '~/composables/useAppLocale'
import type { Booking } from '~/models/booking'
import type { PaginationMeta } from '~/models/pagination'
import {
  changeAdminBookingRoom,
  approveAdminBookingWithScope,
  bulkAdminBookingAction,
  fetchAdminAllBookings,
  fetchAdminPendingBookings,
  fetchBookingReport,
  rejectAdminBookingWithScope,
} from '~/services/adminBookings'
import { fetchAdminRooms } from '~/services/adminRooms'
import { exportBookingsToExcel } from '~/utils/excel-bookings'

const { tr, localeTag } = useAppLocale()
const auth = useAuth()
auth.loadFromStorage()

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const actingId = ref<number | null>(null)

const pendingBookings = ref<Booking[]>([])
const allBookings = ref<Booking[]>([])
const selected = ref<Record<number, boolean>>({})

const pendingPage = ref(1)
const allPage = ref(1)
const pageSize = 10

const pendingMeta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })
const allMeta = ref<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 })

const currentTab = ref<'pending' | 'all' | 'report'>('pending')
const statusFilter = ref<string>('all')
const search = ref<string>('')

const currentBookings = computed(() => (currentTab.value === 'pending' ? pendingBookings.value : allBookings.value))
const currentMeta = computed(() => (currentTab.value === 'pending' ? pendingMeta.value : allMeta.value))
const selectedIds = computed(() => Object.keys(selected.value).filter((id) => selected.value[Number(id)]).map(Number))

const reportStartDate = ref('')
const reportEndDate = ref('')
const reportStatus = ref('')
const reportRoomId = ref<number | null>(null)
const reportRooms = ref<{ id: number; name: string }[]>([])
const bookingRooms = ref<{ id: number; name: string }[]>([])
const reportData = ref<Booking[]>([])
const reportSummary = ref<{ total: number; pending: number; approved: number; rejected: number; completed: number; canceled: number } | null>(null)
const reportLoading = ref(false)
const reportError = ref<string | null>(null)
const reportExporting = ref(false)

function setTab(tab: 'pending' | 'all' | 'report') {
  currentTab.value = tab
  if (tab === 'report') {
    router.push({ path: '/admin/bookings', query: { tab: 'report' } })
    if (reportRooms.value.length === 0) loadReportRooms()
    if (!reportStartDate.value) {
      const now = new Date()
      const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      reportStartDate.value = thirtyAgo.toISOString().slice(0, 10)
      reportEndDate.value = now.toISOString().slice(0, 10)
    }
  } else {
    router.push({ path: '/admin/bookings', query: tab === 'all' ? { tab } : {} })
  }
}

function tabClass(tab: 'pending' | 'all' | 'report') {
  return currentTab.value === tab
    ? 'bg-indigo-600 text-white border-indigo-600'
    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
}

async function loadReportRooms() {
  try {
    const res = await fetchAdminRooms({ page: 1, pageSize: 100 }, auth.authHeaders())
    reportRooms.value = (res.data || []).map(r => ({ id: r.id, name: r.name }))
  } catch {
  }
}

async function loadBookingRooms() {
  try {
    const res = await fetchAdminRooms({ page: 1, pageSize: 100 }, auth.authHeaders())
    bookingRooms.value = (res.data || [])
      .filter(r => r.available_for_booking !== false && r.available_for_booking !== 0)
      .map(r => ({ id: r.id, name: r.name }))
  } catch {
    bookingRooms.value = []
  }
}

async function loadReport() {
  if (!reportStartDate.value || !reportEndDate.value) return
  reportLoading.value = true
  reportError.value = null
  try {
    const params: any = {
      start_date: reportStartDate.value,
      end_date: reportEndDate.value,
    }
    if (reportStatus.value) params.status = reportStatus.value
    if (reportRoomId.value) params.room_id = reportRoomId.value

    const res = await fetchBookingReport(params, auth.authHeaders())
    reportData.value = res.data || []
    reportSummary.value = res.summary
  } catch (e: any) {
    reportError.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat report.', 'Failed to load report.')
  } finally {
    reportLoading.value = false
  }
}

async function handleReportExport() {
  if (!reportData.value.length) return
  reportExporting.value = true
  try {
    const dateRange = reportStartDate.value && reportEndDate.value
      ? { start: reportStartDate.value, end: reportEndDate.value }
      : undefined
    await exportBookingsToExcel(reportData.value, dateRange, localeTag.value)
    await Swal.fire({ icon: 'success', title: tr('Export berhasil', 'Export successful'), timer: 1200, showConfirmButton: false })
  } catch {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Gagal export data.', 'Failed to export data.') })
  } finally {
    reportExporting.value = false
  }
}

async function fetchPending() {
  const res = await fetchAdminPendingBookings(buildQuery(pendingPage.value, pageSize, search.value), auth.authHeaders())
  pendingBookings.value = res.data || []
  pendingMeta.value = res.meta
}

async function fetchAll() {
  const res = await fetchAdminAllBookings(buildQuery(allPage.value, pageSize, search.value, statusFilter.value), auth.authHeaders())
  allBookings.value = res.data || []
  allMeta.value = res.meta
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    if (currentTab.value === 'pending') {
      await fetchPending()
    } else if (currentTab.value === 'all') {
      await fetchAll()
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat data.', 'Failed to load data.')
  } finally {
    loading.value = false
  }
}

function clearSelection() {
  selected.value = {}
}

function toggleSelected(booking: Booking) {
  selected.value = { ...selected.value, [booking.id]: !selected.value[booking.id] }
}

function selectedBulkItems() {
  const byId = new Map(currentBookings.value.map((b) => [b.id, b]))
  return selectedIds.value
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((b: Booking) => ({
      bookingId: b.id,
      occurrenceId: b.is_recurring ? undefined : b.next_pending_occurrence?.id,
      scope: b.is_recurring ? 'all' as const : 'occurrence' as const,
    }))
}

async function bulkAction(action: 'approve' | 'reject' | 'cancel') {
  const items = selectedBulkItems()
  if (!items.length) return
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
        if (action === 'reject' && (!value || !String(value).trim())) {
          Swal.showValidationMessage(tr('Alasan penolakan wajib diisi.', 'Rejection reason is required.'))
        }
        return value
      },
    })
    if (!res.isConfirmed) return
    reason = typeof res.value === 'string' ? res.value.trim() : ''
  }

  try {
    const res = await bulkAdminBookingAction({ action, items, reason }, auth.authHeaders())
    await Swal.fire({ icon: res.failed ? 'warning' : 'success', title: `${res.processed} berhasil, ${res.failed} gagal`, timer: 1400, showConfirmButton: false })
    clearSelection()
    await refresh()
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.data?.statusMessage || e?.statusMessage || tr('Bulk action gagal.', 'Bulk action failed.') })
  }
}

function canAdminCancel(booking: Booking) {
  return booking.status === 'approved' || booking.status === 'rejected'
}

async function changeBookingRoom(booking: Booking) {
  if (bookingRooms.value.length === 0) {
    await loadBookingRooms()
  }
  const options = Object.fromEntries(
    bookingRooms.value
      .filter((room) => Number(room.id) !== Number(booking.room_id))
      .map((room) => [String(room.id), room.name]),
  )
  if (!Object.keys(options).length) return

  const res = await Swal.fire({
    title: tr('Ganti ruangan booking', 'Change booking room'),
    text: tr('Perubahan berlaku untuk seluruh booking/seri dan akan dicek konflik jadwalnya.', 'This applies to the whole booking/series and schedule conflicts will be checked.'),
    input: 'select',
    inputOptions: options,
    showCancelButton: true,
    confirmButtonText: tr('Ganti Ruangan', 'Change Room'),
    cancelButtonText: tr('Batal', 'Cancel'),
  })
  if (!res.isConfirmed || !res.value) return

  actingId.value = booking.id
  try {
    await changeAdminBookingRoom(booking.id, { roomId: Number(res.value) }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Ruangan diperbarui', 'Room updated'), timer: 1200, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal mengganti ruangan.', 'Failed to change room.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    actingId.value = null
  }
}

async function openRequestLetter(booking: Booking) {
  try {
    const res = await fetch(`/api/bookings/${booking.id}/letter`, { headers: auth.authHeaders() })
    if (!res.ok) throw new Error(tr('Gagal membuka surat.', 'Failed to open letter.'))
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: e?.message || tr('Gagal membuka surat.', 'Failed to open letter.') })
  }
}

function onPageChange(page: number) {
  if (currentTab.value === 'pending') {
    pendingPage.value = page
  } else {
    allPage.value = page
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

function badgeClass(status: string) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-800'
  if (status === 'rejected') return 'bg-red-50 text-red-700'
  if (status === 'completed') return 'bg-slate-100 text-slate-700'
  if (status === 'canceled') return 'bg-slate-100 text-slate-700'
  return 'bg-yellow-50 text-yellow-800'
}

function borderClass(status: string) {
  if (status === 'approved') return 'border-emerald-200'
  if (status === 'rejected') return 'border-red-200'
  if (status === 'completed') return 'border-slate-200'
  if (status === 'canceled') return 'border-slate-200'
  return 'border-yellow-200'
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(localeTag.value, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBookedSlots(b: any): string {
  const slots = Array.isArray(b?.slots) ? b.slots : []
  if (!slots.length) {
    const start = b?.start_date ? formatDateTime(String(b.start_date)) : '-'
    const end = b?.end_date ? formatDateTime(String(b.end_date)) : '-'
    return `${start} - ${end}`
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

  const parts = Array.from(groups.entries()).map(([dateKey, ranges]) => `${dateKey}: ${Array.from(new Set(ranges)).join(', ')}`)
  return parts.join(' • ')
}

function formatNextPendingSlots(b: Booking): string {
  const occ = b.next_pending_occurrence
  if (!occ) return '-'
  if (Array.isArray(occ.slots) && occ.slots.length) {
    return formatBookedSlots({ slots: occ.slots })
  }
  if (occ.start_at && occ.end_at) {
    return `${formatDateTime(occ.start_at)} - ${formatDateTime(occ.end_at)}`
  }
  return '-'
}

async function approveOccurrence(booking: Booking) {
  if (!booking.next_pending_occurrence) return
  actingId.value = booking.id
  try {
    await approveAdminBookingWithScope(
      booking.id,
      { scope: 'occurrence', occurrenceId: booking.next_pending_occurrence.id },
      auth.authHeaders(),
    )
    await Swal.fire({ icon: 'success', title: tr('Disetujui', 'Approved'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menyetujui.', 'Failed to approve.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    actingId.value = null
  }
}

async function approveAll(booking: Booking) {
  actingId.value = booking.id
  try {
    await approveAdminBookingWithScope(booking.id, { scope: 'all' }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Semua peminjaman disetujui', 'All bookings approved'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menyetujui semua.', 'Failed to approve all.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    actingId.value = null
  }
}

async function rejectAll(booking: Booking) {
  actingId.value = booking.id
  try {
    const res = await Swal.fire({
      title: tr('Alasan penolakan semua', 'Reject all reason'),
      input: 'textarea',
      inputPlaceholder: tr('Tulis alasan penolakan...', 'Write the rejection reason...'),
      showCancelButton: true,
      confirmButtonText: tr('Tolak Semua', 'Reject All'),
      cancelButtonText: tr('Batal', 'Cancel'),
      confirmButtonColor: '#dc2626',
      preConfirm: (value) => {
        if (!value || !value.trim()) Swal.showValidationMessage(tr('Alasan penolakan wajib diisi.', 'Rejection reason is required.'))
        return value
      },
    })
    if (!res.isConfirmed || !res.value) return
    await rejectAdminBookingWithScope(booking.id, { reason: String(res.value).trim(), scope: 'all' }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Semua ditolak', 'All rejected'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menolak semua.', 'Failed to reject all.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    actingId.value = null
  }
}

async function cancelAdminBooking(booking: Booking) {
  actingId.value = booking.id
  try {
    const res = await Swal.fire({
      title: booking.is_recurring ? tr('Batalkan semua booking?', 'Cancel all bookings?') : tr('Batalkan booking?', 'Cancel booking?'),
      input: 'textarea',
      inputPlaceholder: tr('Alasan pembatalan (opsional)', 'Cancellation reason (optional)'),
      showCancelButton: true,
      confirmButtonText: tr('Batalkan', 'Cancel'),
      cancelButtonText: tr('Batal', 'Cancel'),
      confirmButtonColor: '#334155',
    })
    if (!res.isConfirmed) return
    await bulkAdminBookingAction({
      action: 'cancel',
      items: [{ bookingId: booking.id, occurrenceId: booking.next_pending_occurrence?.id, scope: booking.is_recurring ? 'all' : 'occurrence' }],
      reason: typeof res.value === 'string' ? res.value.trim() : '',
    }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Dibatalkan', 'Canceled'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal membatalkan.', 'Failed to cancel.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    actingId.value = null
  }
}

async function rejectOccurrence(booking: Booking) {
  if (!booking.next_pending_occurrence) return
  actingId.value = booking.id
  try {
    const res = await Swal.fire({
      title: tr('Alasan penolakan', 'Rejection reason'),
      input: 'textarea',
      inputPlaceholder: tr('Tulis alasan penolakan...', 'Write the rejection reason...'),
      inputAttributes: { maxlength: '500' },
      showCancelButton: true,
      confirmButtonText: tr('Tolak', 'Reject'),
      cancelButtonText: tr('Batal', 'Cancel'),
      confirmButtonColor: '#dc2626',
      preConfirm: (value) => {
        if (!value || !value.trim()) {
          Swal.showValidationMessage(tr('Alasan penolakan wajib diisi.', 'Rejection reason is required.'))
        }
        return value
      },
    })

    if (!res.isConfirmed || !res.value) {
      actingId.value = null
      return
    }

    await rejectAdminBookingWithScope(
      booking.id,
      {
        reason: String(res.value).trim(),
        scope: 'occurrence',
        occurrenceId: booking.next_pending_occurrence.id,
      },
      auth.authHeaders(),
    )
    await Swal.fire({ icon: 'success', title: tr('Ditolak', 'Rejected'), timer: 900, showConfirmButton: false })
    await refresh()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menolak.', 'Failed to reject.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    actingId.value = null
  }
}

watchEffect(() => {
  const tab = route.query.tab as string
  if (tab === 'all') currentTab.value = 'all'
  else if (tab === 'report') currentTab.value = 'report'
  else currentTab.value = 'pending'

  if (currentTab.value === 'pending') {
    statusFilter.value = 'all'
  }
})

watch([currentTab], () => {
  if (currentTab.value === 'pending') {
    pendingPage.value = 1
    refresh()
  } else if (currentTab.value === 'all') {
    allPage.value = 1
    refresh()
  }
})

watch([statusFilter, search], () => {
  if (currentTab.value === 'pending') {
    pendingPage.value = 1
  } else {
    allPage.value = 1
  }
  if (currentTab.value !== 'report') refresh()
})

onMounted(() => {
  loadBookingRooms()
  if (currentTab.value !== 'report') refresh()
})
</script>
