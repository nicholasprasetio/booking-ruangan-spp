<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto">
        <div class="bg-white rounded-3xl shadow-xl p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ pageTitle }}</h1>
              <p class="text-sm text-gray-600 mt-1">
                {{ tr('Permintaan Anda akan diperiksa oleh admin dan akan dihubungi lebih lanjut.', 'Your request will be reviewed by the admin and we will contact you soon.') }}
              </p>
            </div>
            <NuxtLink to="/user/book-room" class="text-sm font-semibold text-indigo-600 hover:underline">
              {{ tr('Kembali', 'Back') }}
            </NuxtLink>
          </div>

          <div class="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ tr('Ruangan', 'Room') }}</div>
            <div class="text-lg font-semibold text-gray-900 mt-2">
              {{ roomName || tr('Memuat ruangan...', 'Loading room...') }}
            </div>
            <div class="text-sm text-gray-600 mt-2">
              {{ tr('Jam operasional', 'Operating hours') }}: {{ openStart }} - {{ openEnd }} • {{ tr('Interval', 'Interval') }} {{ slotMinutes }} {{ tr('menit', 'minutes') }}
            </div>
            <div class="text-sm text-gray-600 mt-1">
              {{ tr('Kapasitas', 'Capacity') }}: {{ roomCapacity || '-' }} {{ tr('peserta', 'participants') }}
            </div>
          </div>

          <div class="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ tr('Deskripsi', 'Description') }}</div>
            <div class="mt-2 text-sm text-gray-700 whitespace-pre-line break-words">
              {{ roomDescription || '-' }}
            </div>
          </div>

          <form class="mt-6 space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  {{ recurrenceEnabled && !isRescheduleOne ? tr('Mulai Dari', 'Start From') : tr('Tanggal', 'Date') }}
                </label>
                <input
                  v-model="date"
                  v-bind="dateAttrs"
                  type="date"
                  :min="dateMin || undefined"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  @change="loadSchedule"
                />
                <p v-if="errors.date" class="mt-1 text-xs text-red-600">{{ errors.date }}</p>
                <p v-if="dateMin && !isAdminUser" class="mt-1 text-xs text-gray-500">
                  {{ tr(`Minimal tanggal booking: ${dateMin}`, `Earliest booking date: ${dateMin}`) }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Slot Tersedia', 'Available Slots') }}</label>
                <div class="text-sm text-gray-600">
                  {{ tr('Pilih slot yang masih kosong.', 'Choose available time slots.') }}
                </div>
              </div>
            </div>

            <div v-if="scheduleLoading" class="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
              {{ tr('Memuat jadwal ruangan...', 'Loading room schedule...') }}
            </div>

            <div v-else class="space-y-3">
              <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                <button
                  v-for="slot in slots"
                  :key="slot.label"
                  type="button"
                  class="px-3 py-2 rounded-xl text-xs font-semibold border transition"
                  :class="slotButtonClass(slot)"
                  :disabled="!slot.available"
                  @click="selectSlot(slot)"
                >
                  {{ slot.label }}
                </button>
              </div>

              <div v-if="slotError" class="text-sm text-red-600">
                {{ slotError }}
              </div>

            </div>

            <div class="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-gray-800">{{ tr('Booking Berulang', 'Recurring Booking') }}</div>
                  <div class="text-xs text-gray-600 mt-1">
                    {{ tr('Buat booking otomatis berulang (harian / mingguan / bulanan / tahunan) sampai tanggal tertentu.', 'Create automatic recurring bookings (daily / weekly / monthly / yearly) until a specific date.') }}
                  </div>
                </div>
                <label class="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 select-none">
                  <input
                    v-model="recurrenceEnabled"
                    v-bind="recurrenceEnabledAttrs"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    :disabled="isRescheduleOne"
                  />
                  {{ tr('Aktifkan', 'Enable') }}
                </label>
              </div>

              <div v-if="isRescheduleOne" class="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                {{ tr('Reschedule hanya untuk peminjaman ini.', 'Rescheduling applies only to this booking.') }}
              </div>

              <div v-if="recurrenceEnabled && !isRescheduleOne" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Tipe', 'Type') }}</label>
                  <select
                    v-model="recurrenceFrequency"
                    v-bind="recurrenceFrequencyAttrs"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  >
                    <option value="">{{ tr('Pilih...', 'Select...') }}</option>
                    <option value="daily">{{ tr('Harian', 'Daily') }}</option>
                    <option value="weekly">{{ tr('Mingguan', 'Weekly') }}</option>
                    <option value="monthly">{{ tr('Bulanan', 'Monthly') }}</option>
                    <option value="yearly">{{ tr('Tahunan', 'Yearly') }}</option>
                  </select>
                  <p v-if="errors.recurrenceFrequency" class="mt-1 text-xs text-red-600">{{ errors.recurrenceFrequency }}</p>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Interval', 'Interval') }}</label>
                  <input
                    v-model.number="recurrenceInterval"
                    v-bind="recurrenceIntervalAttrs"
                    type="number"
                    min="1"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    placeholder="1"
                  />
                  <p v-if="errors.recurrenceInterval" class="mt-1 text-xs text-red-600">{{ errors.recurrenceInterval }}</p>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Aktif Sampai', 'Active Until') }}</label>
                  <input
                  v-model="recurrenceUntil"
                  v-bind="recurrenceUntilAttrs"
                  type="date"
                  :min="dateMin || undefined"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
                  <p v-if="errors.recurrenceUntil" class="mt-1 text-xs text-red-600">{{ errors.recurrenceUntil }}</p>
                </div>

                <div v-if="recurrenceFrequency === 'weekly'" class="md:col-span-3">
                  <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Hari Mingguan', 'Weekly Days') }}</label>
                  <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    <label
                      v-for="opt in weekdayOptions"
                      :key="opt.value"
                      class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                    >
                      <input v-model="recurrenceWeeklyDays" type="checkbox" :value="opt.value" class="h-4 w-4" />
                      <span>{{ opt.label }}</span>
                    </label>
                  </div>
                  <p v-if="errors.recurrenceWeeklyDays" class="mt-1 text-xs text-red-600">{{ errors.recurrenceWeeklyDays }}</p>
                </div>

                <div v-if="recurrenceFrequency === 'monthly'" class="md:col-span-3 md:max-w-xs">
                  <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Tanggal Bulanan', 'Monthly Day') }}</label>
                  <input
                    v-model.number="recurrenceMonthlyDay"
                    v-bind="recurrenceMonthlyDayAttrs"
                    type="number"
                    min="1"
                    max="31"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    placeholder="1-31"
                  />
                  <p v-if="errors.recurrenceMonthlyDay" class="mt-1 text-xs text-red-600">{{ errors.recurrenceMonthlyDay }}</p>
                </div>

                <div v-if="recurrenceFrequency === 'yearly'" class="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Bulan Tahunan', 'Yearly Month') }}</label>
                    <input
                      v-model.number="recurrenceYearlyMonth"
                      v-bind="recurrenceYearlyMonthAttrs"
                      type="number"
                      min="1"
                      max="12"
                      class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      placeholder="1-12"
                    />
                    <p v-if="errors.recurrenceYearlyMonth" class="mt-1 text-xs text-red-600">{{ errors.recurrenceYearlyMonth }}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Tanggal Tahunan', 'Yearly Day') }}</label>
                    <input
                      v-model.number="recurrenceYearlyDay"
                      v-bind="recurrenceYearlyDayAttrs"
                      type="number"
                      min="1"
                      max="31"
                      class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      placeholder="1-31"
                    />
                    <p v-if="errors.recurrenceYearlyDay" class="mt-1 text-xs text-red-600">{{ errors.recurrenceYearlyDay }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Nama Kegiatan', 'Activity Name') }}</label>
                <input
                  v-model="activityName"
                  v-bind="activityNameAttrs"
                  type="text"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  :placeholder="tr('Contoh: Rapat Lingkungan', 'Example: Community Meeting')"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Estimasi Peserta', 'Estimated Participants') }}</label>
                <input
                  v-model.number="participantCount"
                  v-bind="participantCountAttrs"
                  type="number"
                  min="1"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  :placeholder="tr('Contoh: 40', 'Example: 40')"
                />
                <p v-if="errors.participantCount" class="mt-1 text-xs text-red-600">{{ errors.participantCount }}</p>
              </div>
            </div>

            <div v-if="bookingLetterTemplate?.available">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                <div>
                  <label class="block text-sm font-semibold text-gray-700">{{ tr('Surat Pengajuan', 'Request Letter') }}</label>
                  <p class="mt-1 text-xs text-gray-500">{{ tr('Download template, isi, lalu upload PDF yang sudah diisi.', 'Download the template, fill it, then upload the completed PDF.') }}</p>
                </div>
                <a
                  href="/api/public/settings/booking-letter-template/file"
                  class="shrink-0 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 text-center"
                >
                  {{ tr('Download Template', 'Download Template') }}
                </a>
              </div>
              <div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <FileUpload
                  accept="application/pdf"
                  :multiple="false"
                  :headers="auth.authHeaders()"
                  :presign-payload="{ prefix: 'booking-letters' }"
                  :show-progress="false"
                  :disabled="loading"
                  @uploaded="onRequestLetterUploaded"
                  @upload-error="onRequestLetterUploadError"
                />
                <div v-if="requestLetter" class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white border border-gray-200 p-3 text-sm">
                  <div class="min-w-0">
                    <div class="font-semibold text-gray-800 truncate">{{ requestLetter.fileName }}</div>
                    <div class="text-xs text-gray-500">{{ formatBytes(requestLetter.byteSize) }}</div>
                  </div>
                  <button type="button" class="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition" @click="requestLetter = null">
                    {{ tr('Hapus', 'Remove') }}
                  </button>
                </div>
                <p class="mt-2 text-xs text-gray-500">{{ tr('Format PDF maksimal 6 MB.', 'PDF format up to 6 MB.') }}</p>
              </div>
            </div>
            <div v-else class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div class="flex items-start gap-3">
                <Icon name="mdi:file-alert-outline" class="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <div class="font-semibold">{{ tr('Template surat belum tersedia', 'Request letter template is not available yet') }}</div>
                  <p class="mt-1">{{ tr('Upload surat peminjaman akan tersedia setelah admin mengatur template surat.', 'Request letter upload will be available after an admin sets the letter template.') }}</p>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">{{ tr('Catatan Tambahan', 'Additional Notes') }}</label>
              <textarea
                v-model="notes"
                v-bind="notesAttrs"
                rows="3"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                :placeholder="tr('Kebutuhan ruangan, fasilitas, atau info tambahan', 'Room requirements, facilities, or additional info')"
              ></textarea>
            </div>

            <div v-if="error" class="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {{ error }}
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span v-if="!loading">{{ submitLabel }}</span>
              <span v-else>{{ tr('Memproses...', 'Processing...') }}</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import { useForm } from 'vee-validate'
import type { Booking } from '~/models/booking'
import type { ExternalBookingLetterTemplate } from '~/models/external-booking'
import { createBooking, fetchBookingById, rescheduleBooking, rescheduleBookingSeries } from '~/services/bookings'
import { fetchPublicBookingLetterTemplate } from '~/services/publicBooking'
import { fetchRoomScheduleById } from '~/services/rooms'
import { fetchGeneralBookingSettings } from '~/services/settings'
import { createBookingRequestSchema } from '~/validators/bookingRequest'
import { useAppLocale } from '~/composables/useAppLocale'

const auth = useAuth()
const { tr } = useAppLocale()
auth.loadFromStorage()

const route = useRoute()
const roomId = Number(route.params.roomId)
const rescheduleId = computed(() => {
  const q = route.query.reschedule
  const raw = Array.isArray(q) ? q[0] : q
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
})
const rescheduleOccurrenceId = computed(() => {
  const q = route.query.occurrence
  const raw = Array.isArray(q) ? q[0] : q
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
})
const rescheduleSeriesId = computed(() => {
  const q = route.query.rescheduleSeries
  const raw = Array.isArray(q) ? q[0] : q
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
})

const isRescheduleOne = computed(() => Boolean(rescheduleId.value))
const isRescheduleSeries = computed(() => Boolean(rescheduleSeriesId.value))
const isReschedule = computed(() => isRescheduleOne.value || isRescheduleSeries.value)

const pageTitle = computed(() => {
  if (isRescheduleSeries.value) return tr('Reschedule Berulang', 'Recurring Reschedule')
  if (isRescheduleOne.value) return tr('Reschedule Peminjaman', 'Booking Reschedule')
  return tr('Ajukan Peminjaman', 'Submit Booking Request')
})

const submitLabel = computed(() => {
  if (isRescheduleSeries.value) return tr('Kirim Reschedule (Semua)', 'Submit Reschedule (All)')
  if (isRescheduleOne.value) return tr('Kirim Reschedule', 'Submit Reschedule')
  return tr('Kirim Permintaan Peminjaman', 'Submit Booking Request')
})

function todayUtcYmd(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const dateInitial = (route.query.date as string) || todayUtcYmd()
const loading = ref(false)
const error = ref<string | null>(null)
const scheduleLoading = ref(false)
const slotError = ref<string | null>(null)

const roomName = ref<string>('')
const roomDescription = ref<string>('')
const roomCapacity = ref<number | null>(null)
const openStart = ref<string>('00:00')
const openEnd = ref<string>('24:00')
const slotMinutes = ref<number>(60)
const bookings = ref<Array<{ id: number; start: string; end: string; status: string | null }>>([])
const resolvedOccurrenceId = ref<number | null>(null)
const bookingMinLeadDays = ref(0)
const currentUserRoles = ref<string[]>([])
const bookingLetterTemplate = ref<ExternalBookingLetterTemplate | null>(null)
const requestLetter = ref<{
  objectKey: string
  fileName: string
  contentType: string
  byteSize: number
} | null>(null)

const selectedSlots = ref<number[]>([])
const bookingRequestSchema = computed(() => createBookingRequestSchema(tr))
const isAdminUser = computed(() => currentUserRoles.value.includes('admin'))
const dateMin = computed(() => {
  if (isAdminUser.value || bookingMinLeadDays.value <= 0) return ''
  const today = todayUtcYmd()
  const d = new Date(`${today}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + bookingMinLeadDays.value)
  return d.toISOString().slice(0, 10)
})

const {
  handleSubmit,
  errors,
  defineField,
  setFieldValue,
} = useForm({
  validationSchema: bookingRequestSchema,
  initialValues: {
    date: dateInitial,
    recurrenceEnabled: false,
    recurrenceFrequency: '',
    recurrenceUntil: '',
    recurrenceInterval: 1,
    recurrenceWeeklyDays: [] as number[],
    recurrenceMonthlyDay: null as number | null,
    recurrenceYearlyMonth: null as number | null,
    recurrenceYearlyDay: null as number | null,
    activityName: '',
    participantCount: null as number | null,
    notes: '',
  },
})

const [date, dateAttrs] = defineField('date')
const [recurrenceEnabled, recurrenceEnabledAttrs] = defineField('recurrenceEnabled')
const [recurrenceFrequency, recurrenceFrequencyAttrs] = defineField('recurrenceFrequency')
const [recurrenceUntil, recurrenceUntilAttrs] = defineField('recurrenceUntil')
const [recurrenceInterval, recurrenceIntervalAttrs] = defineField('recurrenceInterval')
const [recurrenceWeeklyDays] = defineField('recurrenceWeeklyDays')
const [recurrenceMonthlyDay, recurrenceMonthlyDayAttrs] = defineField('recurrenceMonthlyDay')
const [recurrenceYearlyMonth, recurrenceYearlyMonthAttrs] = defineField('recurrenceYearlyMonth')
const [recurrenceYearlyDay, recurrenceYearlyDayAttrs] = defineField('recurrenceYearlyDay')
const [activityName, activityNameAttrs] = defineField('activityName')
const [participantCount, participantCountAttrs] = defineField('participantCount')
const [notes, notesAttrs] = defineField('notes')

const weekdayOptions = computed(() => [
  { value: 0, label: tr('Min', 'Sun') },
  { value: 1, label: tr('Sen', 'Mon') },
  { value: 2, label: tr('Sel', 'Tue') },
  { value: 3, label: tr('Rab', 'Wed') },
  { value: 4, label: tr('Kam', 'Thu') },
  { value: 5, label: tr('Jum', 'Fri') },
  { value: 6, label: tr('Sab', 'Sat') },
])

function selectedSlotLabels(): string[] {
  return [...selectedSlots.value].sort((a, b) => a - b).map((min) => toTimeLabel(min))
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function onRequestLetterUploaded(file: any) {
  requestLetter.value = {
    objectKey: file.objectKey,
    fileName: file.file?.name || 'surat-pengajuan.pdf',
    contentType: file.contentType,
    byteSize: Number(file.byteSize || 0),
  }
}

async function onRequestLetterUploadError(message: string) {
  await Swal.fire({ icon: 'error', title: tr('Upload gagal', 'Upload failed'), text: message })
}

async function loadCurrentUserAndSettings() {
  try {
    const [me, settings, template] = await Promise.all([
      $fetch<{ user: { role_names?: string[] } | null }>('/api/auth/me', { headers: auth.authHeaders() }),
      fetchGeneralBookingSettings(auth.authHeaders()),
      fetchPublicBookingLetterTemplate(),
    ])
    currentUserRoles.value = me.user?.role_names || []
    bookingMinLeadDays.value = Number(settings.settings.booking_min_lead_days || 0)
    bookingLetterTemplate.value = template.template
    if (!isAdminUser.value && dateMin.value && String(date.value || '') < dateMin.value) {
      setFieldValue('date', dateMin.value)
    }
  } catch {
    currentUserRoles.value = []
  }
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

function toTimeLabel(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0')
  const m = String(min % 60).padStart(2, '0')
  return h === '24' ? '00:' + m : `${h}:${m}`
}

function utcMinutes(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

const slots = computed(() => {
  const items: Array<{ label: string; startMin: number; endMin: number; available: boolean }> = []
  const startMin = toMinutes(openStart.value)
  const endMin = toMinutes(openEnd.value)
  const step = slotMinutes.value

  if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || startMin >= endMin) return items
  for (let m = startMin; m + step <= endMin; m += step) {
    const slotStart = m
    const slotEnd = m + step
    const overlap = bookings.value.some((b) => {
      const bStart = utcMinutes(b.start)
      const bEnd = utcMinutes(b.end)
      return bStart < slotEnd && bEnd > slotStart
    })
    items.push({
      label: `${toTimeLabel(slotStart)}-${toTimeLabel(slotEnd)}`,
      startMin: slotStart,
      endMin: slotEnd,
      available: !overlap,
    })
  }
  return items
})

function toLocalYmd(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmdParts(ymd: string): { y: number; m: number; d: number } | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

function weekdayFromYmd(ymd: string): number | null {
  const p = parseYmdParts(ymd)
  if (!p) return null
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()
}

function applyRecurrenceDefaultsFromDate(ymd: string) {
  const p = parseYmdParts(ymd)
  if (!p) return

  if (!recurrenceInterval.value || Number(recurrenceInterval.value) < 1) {
    setFieldValue('recurrenceInterval', 1)
  }

  if (!recurrenceMonthlyDay.value) {
    setFieldValue('recurrenceMonthlyDay', p.d)
  }
  if (!recurrenceYearlyMonth.value) {
    setFieldValue('recurrenceYearlyMonth', p.m)
  }
  if (!recurrenceYearlyDay.value) {
    setFieldValue('recurrenceYearlyDay', p.d)
  }

  const weeklyDays = Array.isArray(recurrenceWeeklyDays.value)
    ? recurrenceWeeklyDays.value.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : []
  if (!weeklyDays.length) {
    const wd = weekdayFromYmd(ymd)
    if (wd !== null) {
      setFieldValue('recurrenceWeeklyDays', [wd])
    }
  }
}

type RecurrencePayload = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  until: string
  interval?: number
  weeklyDays?: number[]
  monthlyDay?: number
  yearlyMonth?: number
  yearlyDay?: number
}

function buildRecurrencePayload(values: any): RecurrencePayload | null {
  if (!values.recurrenceEnabled || isRescheduleOne.value) {
    return null
  }

  const frequency = values.recurrenceFrequency as RecurrencePayload['frequency']
  const interval = Number(values.recurrenceInterval || 1)
  const payload: RecurrencePayload = {
    frequency,
    until: values.recurrenceUntil,
    interval,
  }

  if (frequency === 'weekly') {
    const weeklyDays = Array.isArray(values.recurrenceWeeklyDays)
      ? values.recurrenceWeeklyDays.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6)
      : []
    payload.weeklyDays = weeklyDays
  }

  if (frequency === 'monthly') {
    payload.monthlyDay = Number(values.recurrenceMonthlyDay)
  }

  if (frequency === 'yearly') {
    payload.yearlyMonth = Number(values.recurrenceYearlyMonth)
    payload.yearlyDay = Number(values.recurrenceYearlyDay)
  }

  return payload
}

function updateSelectionFields() {
  if (selectedSlots.value.length) {
    slotError.value = null
  }
}

function selectSlot(slot: { startMin: number; endMin: number; available: boolean }) {
  if (!slot.available) return
  const next = new Set(selectedSlots.value)
  if (next.has(slot.startMin)) {
    next.delete(slot.startMin)
  } else {
    next.add(slot.startMin)
  }
  selectedSlots.value = Array.from(next)
  updateSelectionFields()
}

function ensureSelection(opts?: { autoPickFirst?: boolean }) {
  const autoPickFirst = opts?.autoPickFirst !== false
  if (!slots.value.length) {
    selectedSlots.value = []
    updateSelectionFields()
    return
  }

  const available = new Set(slots.value.filter((s) => s.available).map((s) => s.startMin))
  selectedSlots.value = selectedSlots.value.filter((startMin) => available.has(startMin))

  if (autoPickFirst && !selectedSlots.value.length) {
    const first = slots.value.find((s) => s.available)
    if (first) {
      selectedSlots.value = [first.startMin]
    }
  }

  updateSelectionFields()
}

watch([recurrenceEnabled, recurrenceFrequency, date], ([enabled, frequency, selectedDate]) => {
  if (!enabled || !frequency) return
  applyRecurrenceDefaultsFromDate(String(selectedDate || ''))
})

async function loadSchedule() {
  scheduleLoading.value = true
  error.value = null
  try {
    const res = await fetchRoomScheduleById(
      roomId,
      {
        date: date.value,
        excludeBookingId: rescheduleSeriesId.value,
        excludeSeriesId: rescheduleSeriesId.value,
        excludeOccurrenceId: rescheduleOccurrenceId.value || resolvedOccurrenceId.value,
      },
      auth.authHeaders(),
    )

    const room = res.room
    if (!room) {
      throw new Error(tr('Ruangan tidak ditemukan.', 'Room not found.'))
    }

    roomName.value = room.name || `${tr('Ruangan', 'Room')} #${roomId}`
    roomDescription.value = room.description || '-'
    roomCapacity.value = room.capacity || null
    openStart.value = room.open_time_start || '00:00'
    openEnd.value = room.open_time_end || '24:00'
    slotMinutes.value = room.slot_minutes || 60
    bookings.value = room.bookings || []

    ensureSelection({ autoPickFirst: !isReschedule.value })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || tr('Gagal memuat jadwal ruangan.', 'Failed to load room schedule.')
  } finally {
    scheduleLoading.value = false
  }
}

function slotButtonClass(slot: { startMin: number; endMin: number; available: boolean }) {
  if (!slot.available) {
    return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
  }
  if (selectedSlots.value.includes(slot.startMin)) {
    return 'bg-indigo-600 text-white border-indigo-600'
  }
  return 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-700'
}

const submit = handleSubmit(async (values) => {
  error.value = null
  if (!roomId) {
    error.value = tr('Ruangan tidak valid.', 'Invalid room.')
    return
  }
  if (!selectedSlots.value.length) {
    error.value = tr('Silakan pilih minimal 1 slot.', 'Please select at least 1 slot.')
    return
  }
  if (
    roomCapacity.value !== null &&
    values.participantCount !== null &&
    Number(values.participantCount) > roomCapacity.value
  ) {
    error.value = tr(
      `Estimasi peserta melebihi kapasitas ruangan (${roomCapacity.value} orang).`,
      `Estimated participants exceed room capacity (${roomCapacity.value} people).`,
    )
    return
  }

  loading.value = true
  
  try {
    if (rescheduleId.value) {
      await rescheduleBooking(
        rescheduleId.value,
        {
          occurrenceId: rescheduleOccurrenceId.value || undefined,
          date: values.date,
          slots: selectedSlotLabels(),
          activityName: values.activityName,
          participantCount: values.participantCount,
          notes: values.notes,
          requestLetter: requestLetter.value,
        },
        auth.authHeaders(),
      )

      await Swal.fire({
        icon: 'success',
        title: tr('Reschedule terkirim', 'Reschedule submitted'),
        text: tr('Admin akan memeriksa jadwal baru Anda.', 'Admin will review your new schedule.'),
        timer: 1500,
        showConfirmButton: false,
      })

      await navigateTo(`/bookings/${rescheduleId.value}`)
    } else if (rescheduleSeriesId.value) {
      if (!values.recurrenceEnabled) {
        throw new Error(tr('Aktifkan Booking Berulang untuk reschedule recurring.', 'Enable recurring booking to reschedule recurring entries.'))
      }

      const recurrencePayload = buildRecurrencePayload(values)
      if (!recurrencePayload) {
        throw new Error(tr('Data recurrence tidak lengkap.', 'Recurrence data is incomplete.'))
      }

      await rescheduleBookingSeries(
        rescheduleSeriesId.value,
        {
          startDate: values.date,
          recurrence: recurrencePayload,
          slots: selectedSlotLabels(),
          activityName: values.activityName,
          participantCount: values.participantCount,
          notes: values.notes,
          requestLetter: requestLetter.value,
        },
        auth.authHeaders(),
      )

      await Swal.fire({
        icon: 'success',
        title: tr('Reschedule berhasil', 'Reschedule successful'),
        text: tr('Recurring booking sudah diperbarui.', 'Recurring booking has been updated.'),
        timer: 1500,
        showConfirmButton: false,
      })

      await navigateTo('/user/bookings')
    } else {
      const recurrencePayload = buildRecurrencePayload(values)

      const res = await createBooking(
        {
          roomId,
          date: values.date,
          slots: selectedSlotLabels(),
          recurrence: recurrencePayload,
          activityName: values.activityName,
          participantCount: values.participantCount,
          notes: values.notes,
        },
        auth.authHeaders(),
      )

      await Swal.fire({
        icon: 'success',
        title: tr('Permintaan terkirim', 'Request submitted'),
        text:
          res.occurrenceIds.length > 1
            ? tr(
              `Recurring berhasil dibuat (${res.occurrenceIds.length} peminjaman). Admin akan memeriksa permintaan Anda.`,
              `Recurring booking created (${res.occurrenceIds.length} bookings). Admin will review your request.`,
            )
            : tr('Admin akan menghubungi Anda setelah memeriksa permintaan ini.', 'Admin will contact you after reviewing this request.'),
        timer: 1500,
        showConfirmButton: false,
      })

      if (res.occurrenceIds.length > 1) {
        await navigateTo('/user/bookings')
      } else {
        await navigateTo(`/bookings/${res.bookingId}`)
      }
    }
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal membuat permintaan peminjaman.', 'Failed to submit booking request.')
    error.value = msg
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    loading.value = false
  }
})

function safeParseJson(value: string): any | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

async function prefillReschedule() {
  if (!rescheduleId.value) return
  const res = await fetchBookingById(rescheduleId.value, auth.authHeaders())
  const b = res.booking as Booking

  if (Number(b.room_id) !== Number(roomId)) {
    throw new Error(tr('Booking tidak cocok dengan ruangan ini.', 'Booking does not match this room.'))
  }
  const allOccurrences = Array.isArray(b.occurrences) ? b.occurrences : []
  const targetOccurrence =
    allOccurrences.find((o) => Number(o.id) === Number(rescheduleOccurrenceId.value))
    || b.next_occurrence
    || allOccurrences.find((o) => o.status === 'pending' || o.status === 'approved')
    || allOccurrences[0]

  if (!targetOccurrence || !targetOccurrence.slots || !targetOccurrence.slots.length) {
    throw new Error(tr('Slot occurrence tidak ditemukan.', 'Occurrence slot not found.'))
  }

  resolvedOccurrenceId.value = Number(targetOccurrence.id)

  setFieldValue('date', toLocalYmd(targetOccurrence.slots[0]!.start_at))
  setFieldValue('activityName', b.activity_name || '')
  setFieldValue('participantCount', b.participant_count ?? null)
  setFieldValue('notes', b.notes || '')

  selectedSlots.value = targetOccurrence.slots.map((s) => {
    const d = new Date(s.start_at)
    return d.getHours() * 60 + d.getMinutes()
  })
  updateSelectionFields()
  setFieldValue('recurrenceEnabled', false)
  setFieldValue('recurrenceInterval', 1)
  setFieldValue('recurrenceWeeklyDays', [])
  setFieldValue('recurrenceMonthlyDay', null)
  setFieldValue('recurrenceYearlyMonth', null)
  setFieldValue('recurrenceYearlyDay', null)
}

async function prefillRescheduleSeries() {
  if (!rescheduleSeriesId.value) return
  const res = await fetchBookingById(rescheduleSeriesId.value, auth.authHeaders())
  const b = res.booking as Booking

  if (Number(b.room_id) !== Number(roomId)) {
    throw new Error(tr('Series tidak cocok dengan ruangan ini.', 'Series does not match this room.'))
  }

  setFieldValue('recurrenceEnabled', true)

  const rule = b.series_rule_json ? safeParseJson(b.series_rule_json) : null
  const freq = (rule?.frequency || b.series_frequency || 'daily') as string
  setFieldValue('recurrenceFrequency', freq)
  setFieldValue('recurrenceUntil', String(rule?.until || b.series_until_date || ''))
  const interval = Number(rule?.interval || b.series_interval || 1)
  setFieldValue('recurrenceInterval', Number.isInteger(interval) && interval >= 1 ? interval : 1)

  let baseDate = ''

  if (b.series_start_date) {
    baseDate = String(b.series_start_date)
    setFieldValue('date', baseDate)
  } else if (b.first_occurrence_start) {
    baseDate = toLocalYmd(String(b.first_occurrence_start))
    setFieldValue('date', baseDate)
  } else if (b.next_occurrence?.slots?.length) {
    baseDate = toLocalYmd(b.next_occurrence.slots[0]!.start_at)
    setFieldValue('date', baseDate)
  }

  const baseParts = baseDate ? parseYmdParts(baseDate) : null
  const baseWeekday = baseDate ? weekdayFromYmd(baseDate) : null

  const weeklyDays = Array.isArray(rule?.weeklyDays)
    ? rule.weeklyDays.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6)
    : []
  setFieldValue('recurrenceWeeklyDays', weeklyDays.length ? weeklyDays : baseWeekday !== null ? [baseWeekday] : [])

  const monthlyDay = Number(rule?.monthlyDay)
  const fallbackMonthlyDay = baseParts?.d || null
  setFieldValue(
    'recurrenceMonthlyDay',
    Number.isInteger(monthlyDay) && monthlyDay >= 1 && monthlyDay <= 31 ? monthlyDay : fallbackMonthlyDay,
  )

  const yearlyMonth = Number(rule?.yearlyMonth)
  const yearlyDay = Number(rule?.yearlyDay)
  const fallbackYearlyMonth = baseParts?.m || null
  const fallbackYearlyDay = baseParts?.d || null
  setFieldValue(
    'recurrenceYearlyMonth',
    Number.isInteger(yearlyMonth) && yearlyMonth >= 1 && yearlyMonth <= 12 ? yearlyMonth : fallbackYearlyMonth,
  )
  setFieldValue(
    'recurrenceYearlyDay',
    Number.isInteger(yearlyDay) && yearlyDay >= 1 && yearlyDay <= 31 ? yearlyDay : fallbackYearlyDay,
  )

  setFieldValue('activityName', b.activity_name || '')
  setFieldValue('participantCount', b.participant_count ?? null)
  setFieldValue('notes', b.notes || '')

  const baseOccurrence =
    b.next_occurrence
    || (Array.isArray(b.occurrences)
      ? b.occurrences.find((o) => o.status === 'pending' || o.status === 'approved') || b.occurrences[0]
      : null)

  if (baseOccurrence?.slots?.length) {
    selectedSlots.value = baseOccurrence.slots.map((s) => {
      const d = new Date(s.start_at)
      return d.getHours() * 60 + d.getMinutes()
    })
    updateSelectionFields()
  }
}

onMounted(async () => {
  try {
    await loadCurrentUserAndSettings()
    if (rescheduleId.value) {
      await prefillReschedule()
    }
    if (rescheduleSeriesId.value) {
      await prefillRescheduleSeries()
    }
    await loadSchedule()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || tr('Gagal memuat halaman.', 'Failed to load page.')
  }
})
</script>
