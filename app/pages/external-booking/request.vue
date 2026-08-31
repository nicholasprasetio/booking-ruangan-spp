<template>
  <div class="min-h-screen bg-slate-50">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800">
            <Icon name="mdi:arrow-left" />
            {{ tr('Kembali ke daftar ruangan', 'Back to room list') }}
          </NuxtLink>
          <h1 class="mt-3 text-3xl font-bold text-gray-900">{{ tr('Form Pengajuan Peminjaman', 'Room Request Form') }}</h1>
          <p class="mt-2 text-gray-600">{{ tr('Lengkapi data pengajuan. Admin akan memeriksa sebelum booking dibuat.', 'Complete the request details. Admin will review before creating the booking.') }}</p>
        </div>
      </div>

      <div v-if="loading" class="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-600">
        {{ tr('Memuat data pengajuan...', 'Loading request data...') }}
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <aside class="space-y-4">
          <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            <div class="aspect-[16/9] bg-gray-100">
              <img v-if="room?.photos?.length" :src="room.photos[0]?.url" :alt="room.name || 'Ruangan'" class="h-full w-full object-cover" />
              <div v-else class="h-full w-full flex items-center justify-center text-gray-400">
                <Icon name="mdi:door-open" size="42" />
              </div>
            </div>
            <div class="p-5">
              <h2 class="text-xl font-bold text-gray-900">{{ room?.name || tr('Ruangan', 'Room') }}</h2>
              <p class="mt-1 text-sm text-gray-600">{{ room?.location || '-' }}</p>

              <div class="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <div class="text-xs text-gray-500 font-semibold uppercase">{{ tr('Tanggal', 'Date') }}</div>
                  <div class="mt-1">{{ date }}</div>
                </div>
                <div>
                  <div class="text-xs text-gray-500 font-semibold uppercase">{{ tr('Kapasitas', 'Capacity') }}</div>
                  <div class="mt-1">{{ room?.capacity ? `${room.capacity} ${tr('orang', 'people')}` : '-' }}</div>
                </div>
                <div class="col-span-2">
                  <div class="text-xs text-gray-500 font-semibold uppercase">{{ tr('Jam Operasional', 'Operational Hours') }}</div>
                  <div class="mt-1">{{ room?.open_time_start || '00:00' }} - {{ room?.open_time_end || '24:00' }}</div>
                </div>
              </div>

              <div class="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm">
                <div class="text-xs text-gray-500 font-semibold uppercase">{{ tr('Slot Kosong', 'Available Slots') }}</div>
                <p class="mt-1 text-gray-700">{{ formatRanges(availableRanges) }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow border border-gray-100 p-5">
            <h3 class="font-bold text-gray-900">{{ tr('Pilih Slot Final', 'Choose Final Slot') }}</h3>
            <p class="mt-1 text-sm text-gray-600">
              {{ tr('Pilih slot kosong yang berurutan. Rentang ini yang akan diajukan ke admin.', 'Choose contiguous open slots. This range will be submitted to admin.') }}
            </p>

            <div v-if="slots.length" class="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
              <button
                v-for="slot in slots"
                :key="slot.startMin"
                type="button"
                class="px-3 py-2 rounded-xl text-xs font-semibold border transition"
                :class="slotButtonClass(slot)"
                :disabled="!slot.available"
                @click="selectSlot(slot)"
              >
                {{ slot.label }}
              </button>
            </div>
            <div v-else class="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-600">
              {{ tr('Tidak ada slot operasional untuk ruangan ini.', 'No operational slots for this room.') }}
            </div>

            <div v-if="selectedRange" class="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 text-sm font-semibold">
              {{ selectedRange.startTime }} - {{ selectedRange.endTime }}
            </div>
            <div v-if="slotError" class="mt-3 text-sm text-red-600">
              {{ slotError }}
            </div>
          </div>
        </aside>

        <main class="bg-white rounded-2xl shadow border border-gray-100 p-5 sm:p-6">
          <form class="space-y-5" @submit.prevent="submitRequest">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nama', 'Name') }}</label>
                <input v-model.trim="form.requesterName" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nomor HP', 'Phone Number') }}</label>
                <input v-model.trim="form.requesterPhone" type="tel" class="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Tujuan Peminjaman', 'Purpose') }}</label>
                <input v-model.trim="form.purpose" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Jumlah Peserta', 'Participants') }}</label>
                <input v-model.number="form.participantCount" type="number" min="1" class="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Asal Lingkungan', 'Community Origin') }}</label>
                <input v-model.trim="form.originEnvironment" type="text" class="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" :placeholder="tr('Opsional', 'Optional')" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Catatan', 'Notes') }}</label>
                <textarea v-model.trim="form.notes" rows="4" class="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"></textarea>
              </div>
            </div>

            <div v-if="template?.available" class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-gray-800">{{ tr('Surat Pengajuan', 'Request Letter') }}</div>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ tr('Download template, isi, lalu upload PDF yang sudah diisi.', 'Download the template, fill it, then upload the completed PDF.') }}
                  </p>
                </div>
                <a
                  href="/api/public/settings/booking-letter-template/file"
                  class="shrink-0 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 text-center"
                >
                  {{ tr('Download Template', 'Download Template') }}
                </a>
              </div>
              <input
                ref="letterInput"
                type="file"
                accept="application/pdf"
                class="mt-3 block w-full text-sm text-gray-700"
                @change="onLetterChange"
              />
              <p v-if="letterFile" class="mt-2 text-xs text-gray-600">{{ letterFile.name }} - {{ formatBytes(letterFile.size) }}</p>
            </div>

            <div v-if="error" class="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {{ error }}
            </div>

            <button
              type="submit"
              class="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
              :disabled="submitting || !room || !selectedRange"
            >
              {{ submitting ? tr('Mengirim...', 'Submitting...') : tr('Kirim Pengajuan', 'Submit Request') }}
            </button>
          </form>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import type { RoomSchedule } from '~/models/booking'
import type { ExternalBookingLetterTemplate } from '~/models/external-booking'
import { fetchPublicBookingLetterTemplate, fetchPublicRoomAvailability, submitExternalBookingRequest } from '~/services/publicBooking'

const { tr } = useAppLocale()
const route = useRoute()

const loading = ref(true)
const submitting = ref(false)
const error = ref<string | null>(null)
const room = ref<RoomSchedule | null>(null)
const availableRanges = ref<Array<{ startTime: string; endTime: string }>>([])
const selectedSlots = ref<number[]>([])
const slotError = ref<string | null>(null)
const template = ref<ExternalBookingLetterTemplate | null>(null)
const letterFile = ref<File | null>(null)
const letterInput = ref<HTMLInputElement | null>(null)
const minLeadDays = ref(0)

const form = reactive({
  requesterName: '',
  requesterPhone: '',
  purpose: '',
  participantCount: null as number | null,
  originEnvironment: '',
  notes: '',
})

function queryString(name: string): string {
  const value = route.query[name]
  return Array.isArray(value) ? String(value[0] || '') : String(value || '')
}

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

const roomId = computed(() => Number(queryString('roomId')))
const date = computed(() => queryString('date') || addDays(jakartaTodayYmd(), Math.max(0, minLeadDays.value)))
const requestedStartTime = computed(() => queryString('startTime'))
const requestedEndTime = computed(() => queryString('endTime'))

type PublicSlot = {
  label: string
  startTime: string
  endTime: string
  startMin: number
  endMin: number
  available: boolean
}

const selectedRange = computed(() => {
  const starts = [...selectedSlots.value].sort((a, b) => a - b)
  if (!starts.length || !room.value) return null
  const slotMinutes = Number(room.value.slot_minutes || 60)
  return {
    startTime: toTimeLabel(starts[0]!),
    endTime: toTimeLabel(starts[starts.length - 1]! + slotMinutes),
  }
})

const slots = computed<PublicSlot[]>(() => {
  if (!room.value) return []
  const slotMinutes = Number(room.value.slot_minutes || 60)
  if (!Number.isFinite(slotMinutes) || slotMinutes <= 0) return []

  const openStart = toMinutes(room.value.open_time_start || '00:00')
  const openEnd = toMinutes(room.value.open_time_end || '24:00')
  const result: PublicSlot[] = []
  for (let min = openStart; min + slotMinutes <= openEnd; min += slotMinutes) {
    const startTime = toTimeLabel(min)
    const endTime = toTimeLabel(min + slotMinutes)
    result.push({
      label: startTime,
      startTime,
      endTime,
      startMin: min,
      endMin: min + slotMinutes,
      available: availableRanges.value.some((range) => range.startTime <= startTime && range.endTime >= endTime),
    })
  }
  return result
})

function formatRanges(ranges: Array<{ startTime: string; endTime: string }>): string {
  if (!ranges.length) return tr('Tidak ada slot kosong.', 'No open slots.')
  const shown = ranges.slice(0, 4).map((range) => `${range.startTime}-${range.endTime}`)
  const suffix = ranges.length > 4 ? ` +${ranges.length - 4}` : ''
  return `${tr('Tersedia:', 'Available:')} ${shown.join(', ')}${suffix}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function toTimeLabel(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

function isContiguousSelection(starts: number[]): boolean {
  if (!room.value || starts.length <= 1) return true
  const slotMinutes = Number(room.value.slot_minutes || 60)
  const sorted = [...starts].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]! - sorted[i - 1]! !== slotMinutes) return false
  }
  return true
}

function selectionIsAvailable(starts: number[]): boolean {
  const available = new Set(slots.value.filter((slot) => slot.available).map((slot) => slot.startMin))
  return starts.every((start) => available.has(start))
}

function selectSlot(slot: PublicSlot) {
  if (!slot.available) return
  const current = new Set(selectedSlots.value)
  if (current.has(slot.startMin)) {
    current.delete(slot.startMin)
  } else {
    current.add(slot.startMin)
  }

  const next = Array.from(current).sort((a, b) => a - b)
  if (!isContiguousSelection(next) || !selectionIsAvailable(next)) {
    slotError.value = tr('Pilih slot yang berurutan dan tidak melewati slot terisi.', 'Choose contiguous slots without crossing unavailable slots.')
    return
  }

  selectedSlots.value = next
  slotError.value = null
}

function slotButtonClass(slot: PublicSlot) {
  if (!slot.available) {
    return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
  }
  if (selectedSlots.value.includes(slot.startMin)) {
    return 'bg-indigo-600 text-white border-indigo-600'
  }
  return 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-700'
}

function clearInvalidSelectedSlots() {
  const available = new Set(slots.value.filter((slot) => slot.available).map((slot) => slot.startMin))
  selectedSlots.value = selectedSlots.value.filter((start) => available.has(start))
  if (!isContiguousSelection(selectedSlots.value)) {
    selectedSlots.value = []
  }
}

function preselectRequestedRange() {
  selectedSlots.value = []
  slotError.value = null
  if (!requestedStartTime.value || !requestedEndTime.value || !room.value) return

  const startMin = toMinutes(requestedStartTime.value)
  const endMin = toMinutes(requestedEndTime.value)
  const picked = slots.value
    .filter((slot) => slot.startMin >= startMin && slot.endMin <= endMin)
    .map((slot) => slot.startMin)

  if (!picked.length || !isContiguousSelection(picked) || !selectionIsAvailable(picked)) {
    slotError.value = tr('Slot dari halaman sebelumnya sudah tidak tersedia. Pilih slot lain yang masih kosong.', 'The previously selected slot is no longer available. Choose another open slot.')
    return
  }

  const sorted = picked.sort((a, b) => a - b)
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  const slotMinutes = Number(room.value.slot_minutes || 60)
  if (first !== startMin || last + slotMinutes !== endMin) {
    slotError.value = tr('Slot dari halaman sebelumnya tidak sesuai interval ruangan. Pilih slot lain.', 'The previously selected slot does not match this room interval. Choose another slot.')
    return
  }

  selectedSlots.value = sorted
}

function onLetterChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (!file) {
    letterFile.value = null
    return
  }
  if (file.type !== 'application/pdf') {
    error.value = tr('Surat pengajuan harus berupa PDF.', 'Request letter must be a PDF.')
    input.value = ''
    letterFile.value = null
    return
  }
  if (file.size > 6 * 1024 * 1024) {
    error.value = tr('Ukuran surat maksimal 6 MB.', 'Letter size is limited to 6 MB.')
    input.value = ''
    letterFile.value = null
    return
  }
  error.value = null
  letterFile.value = file
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    if (!Number.isFinite(roomId.value) || roomId.value <= 0) {
      throw new Error(tr('Ruangan tidak valid.', 'Invalid room.'))
    }

    const [settingsRes, templateRes] = await Promise.all([
      $fetch<{ ok: boolean; settings: { booking_min_lead_days: number } }>('/api/settings/general'),
      fetchPublicBookingLetterTemplate(),
    ])
    minLeadDays.value = Number(settingsRes.settings.booking_min_lead_days || 0)
    template.value = templateRes.template

    const hasRange = Boolean(requestedStartTime.value && requestedEndTime.value)
    let res = await fetchPublicRoomAvailability({
      roomId: roomId.value,
      date: date.value,
      startTime: hasRange ? requestedStartTime.value : undefined,
      endTime: hasRange ? requestedEndTime.value : undefined,
      page: 1,
      pageSize: 1,
    })

    if (!res.data?.length && hasRange) {
      res = await fetchPublicRoomAvailability({
        roomId: roomId.value,
        date: date.value,
        page: 1,
        pageSize: 1,
      })
      error.value = tr('Slot yang dipilih sudah tidak tersedia. Pilih slot lain yang masih kosong.', 'The selected slot is no longer available. Choose another open slot.')
    }

    room.value = res.data?.[0] || null
    availableRanges.value = room.value?.available_ranges || []
    clearInvalidSelectedSlots()
    preselectRequestedRange()
  } catch (e: any) {
    room.value = null
    availableRanges.value = []
    selectedSlots.value = []
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || tr('Gagal memuat form pengajuan.', 'Failed to load request form.')
  } finally {
    loading.value = false
  }
}

function validateForm(): string | null {
  if (!room.value) return tr('Ruangan tidak ditemukan.', 'Room not found.')
  if (!selectedRange.value) return tr('Pilih slot peminjaman terlebih dahulu.', 'Choose a booking slot first.')
  if (!isContiguousSelection(selectedSlots.value) || !selectionIsAvailable(selectedSlots.value)) {
    return tr('Slot yang dipilih harus kosong dan berurutan.', 'Selected slots must be available and contiguous.')
  }
  if (!form.requesterName || !form.requesterPhone || !form.purpose || !form.participantCount) {
    return tr('Nama, nomor HP, tujuan, dan jumlah peserta wajib diisi.', 'Name, phone, purpose, and participants are required.')
  }
  if (room.value.capacity && Number(form.participantCount) > Number(room.value.capacity)) {
    return tr(`Jumlah peserta melebihi kapasitas ruangan (${room.value.capacity} orang).`, `Participants exceed room capacity (${room.value.capacity} people).`)
  }
  if (template.value?.available && !letterFile.value) {
    return tr('Upload surat pengajuan wajib karena template sudah tersedia.', 'Request letter upload is required because a template is available.')
  }
  return null
}

async function submitRequest() {
  const validationError = validateForm()
  if (validationError) {
    error.value = validationError
    return
  }

  submitting.value = true
  error.value = null
  try {
    const data = new FormData()
    data.append('requesterName', form.requesterName)
    data.append('requesterPhone', form.requesterPhone)
    data.append('purpose', form.purpose)
    data.append('participantCount', String(form.participantCount))
    data.append('originEnvironment', form.originEnvironment || '')
    data.append('notes', form.notes || '')
    data.append('roomId', String(room.value!.id))
    data.append('date', date.value)
    data.append('startTime', selectedRange.value!.startTime)
    data.append('endTime', selectedRange.value!.endTime)
    if (letterFile.value) data.append('requestLetter', letterFile.value)

    const res = await submitExternalBookingRequest(data)
    await Swal.fire({
      icon: 'success',
      title: tr('Pengajuan terkirim', 'Request submitted'),
      text: tr(`Nomor pengajuan: ${res.requestId}. Admin akan memeriksa dan menghubungi Anda.`, `Request number: ${res.requestId}. Admin will review and contact you.`),
    })
    await navigateTo('/')
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal mengirim pengajuan.', 'Failed to submit request.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
    await loadData()
    error.value = msg
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>
