<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Kalender Ruangan', 'Room Calendar') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Lihat jadwal peminjaman ruangan secara visual.', 'View room booking schedules visually.') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="selectedRoomId"
              class="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"
            >
              <option :value="null">{{ tr('Semua Ruangan', 'All Rooms') }}</option>
              <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
            </select>
            <button
              class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm text-sm"
              :disabled="loading"
              @click="refetchEvents"
            >
              <Icon name="mdi:refresh" />
              {{ tr('Perbarui', 'Refresh') }}
            </button>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap items-center gap-4 mb-4 text-sm">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
            <span class="text-gray-600">{{ tr('Menunggu', 'Pending') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span class="text-gray-600">{{ tr('Disetujui', 'Approved') }}</span>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading && !calendarReady" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
          {{ tr('Memuat kalender...', 'Loading calendar...') }}
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-4">
          {{ error }}
        </div>

        <!-- Calendar -->
        <div class="booking-calendar-shell bg-white rounded-2xl shadow-xl border border-gray-100 p-3 sm:p-4 overflow-x-auto">
          <FullCalendar ref="calendarRef" :options="calendarOptions" />
        </div>
      </div>
    </div>

    <!-- Event Detail Popup -->
    <Teleport to="body">
      <div
        v-if="showEventDetail && selectedEvent"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeEventDetail"
      >
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-900">{{ tr('Detail Peminjaman', 'Booking Details') }}</h2>
            <button class="text-gray-400 hover:text-gray-600" @click="closeEventDetail">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex items-start gap-3">
              <Icon name="mdi:door-open" class="text-indigo-500 mt-0.5" size="20" />
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase">{{ tr('Ruangan', 'Room') }}</div>
                <div class="text-gray-900 font-medium">{{ selectedEvent.extendedProps.room_name }}</div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <Icon name="mdi:calendar-clock" class="text-indigo-500 mt-0.5" size="20" />
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase">{{ tr('Waktu', 'Time') }}</div>
                <div class="text-gray-900">{{ formatEventTime(selectedEvent) }}</div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <Icon name="mdi:clipboard-text" class="text-indigo-500 mt-0.5" size="20" />
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase">{{ tr('Kegiatan', 'Activity') }}</div>
                <div class="text-gray-900">{{ selectedEvent.extendedProps.activity_name || '-' }}</div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <Icon name="mdi:account" class="text-indigo-500 mt-0.5" size="20" />
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase">{{ tr('Peminjam', 'Borrower') }}</div>
                <div class="text-gray-900">{{ selectedEvent.extendedProps.user_name || '-' }}</div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <Icon name="mdi:account-group" class="text-indigo-500 mt-0.5" size="20" />
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase">{{ tr('Peserta', 'Participants') }}</div>
                <div class="text-gray-900">{{ selectedEvent.extendedProps.participant_count ? `${selectedEvent.extendedProps.participant_count} ${tr('orang', 'people')}` : '-' }}</div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <Icon name="mdi:check-circle" class="mt-0.5" :class="selectedEvent.extendedProps.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'" size="20" />
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase">{{ tr('Status', 'Status') }}</div>
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  :class="selectedEvent.extendedProps.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'"
                >
                  {{ selectedEvent.extendedProps.status === 'approved' ? tr('Disetujui', 'Approved') : tr('Menunggu', 'Pending') }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-5 flex gap-3 justify-end">
            <NuxtLink
              :to="`/bookings/${selectedEvent.extendedProps.booking_id}`"
              class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              {{ tr('Lihat Detail Lengkap', 'View Full Details') }}
            </NuxtLink>
            <button class="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition" @click="closeEventDetail">
              {{ tr('Tutup', 'Close') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions, EventClickArg, DatesSetArg, EventInput } from '@fullcalendar/core'
import { fetchCalendarEvents } from '~/services/adminCalendar'
import { fetchAdminRooms } from '~/services/adminRooms'

const { tr, localeTag, calendarLocale } = useAppLocale()
const auth = useAuth()
auth.loadFromStorage()

const loading = ref(false)
const error = ref<string | null>(null)
const calendarReady = ref(false)
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)

const rooms = ref<{ id: number; name: string }[]>([])
const selectedRoomId = ref<number | null>(null)
const events = ref<EventInput[]>([])

const showEventDetail = ref(false)
const selectedEvent = ref<any>(null)

// Color palette for rooms
const roomColors: Record<number, { bg: string; border: string; text: string }> = {}
const colorPalette = [
  { bg: '#818cf8', border: '#6366f1', text: '#ffffff' }, // indigo
  { bg: '#34d399', border: '#10b981', text: '#ffffff' }, // emerald
  { bg: '#f472b6', border: '#ec4899', text: '#ffffff' }, // pink
  { bg: '#60a5fa', border: '#3b82f6', text: '#ffffff' }, // blue
  { bg: '#a78bfa', border: '#8b5cf6', text: '#ffffff' }, // violet
  { bg: '#fb923c', border: '#f97316', text: '#ffffff' }, // orange
  { bg: '#38bdf8', border: '#0ea5e9', text: '#ffffff' }, // sky
  { bg: '#f87171', border: '#ef4444', text: '#ffffff' }, // red
]

function getRoomColor(roomId: number) {
  if (!roomColors[roomId]) {
    const idx = Object.keys(roomColors).length % colorPalette.length
    roomColors[roomId] = colorPalette[idx]
  }
  return roomColors[roomId]
}

const calendarOptions = computed<CalendarOptions>(() => ({
  timeZone: 'Asia/Jakarta',
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth timeGridWeek timeGridDay',
  },
  locale: calendarLocale.value,
  events: events.value,
  eventClick: handleEventClick,
  datesSet: handleDatesSet,
  height: 'auto',
  dayMaxEvents: 4,
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  slotMinTime: '06:00:00',
  slotMaxTime: '22:00:00',
  buttonText: {
    today: tr('Hari Ini', 'Today'),
    month: tr('Bulan', 'Month'),
    week: tr('Minggu', 'Week'),
    day: tr('Hari', 'Day'),
  },
}))

// Date range tracked by calendar view
const currentStart = ref<string>('')
const currentEnd = ref<string>('')

function handleDatesSet(arg: DatesSetArg) {
  const start = arg.startStr.slice(0, 10)
  const end = arg.endStr.slice(0, 10)
  if (start !== currentStart.value || end !== currentEnd.value) {
    currentStart.value = start
    currentEnd.value = end
    fetchEvents()
  }
  calendarReady.value = true
}

function handleEventClick(info: EventClickArg) {
  selectedEvent.value = info.event
  showEventDetail.value = true
}

function closeEventDetail() {
  showEventDetail.value = false
  selectedEvent.value = null
}

async function fetchRooms() {
  try {
    const res = await fetchAdminRooms({ page: 1, pageSize: 100 }, auth.authHeaders())
    rooms.value = (res.data || []).map(r => ({ id: r.id, name: r.name }))
  } catch {
    // silent
  }
}

async function fetchEvents() {
  if (!currentStart.value || !currentEnd.value) return
  loading.value = true
  error.value = null
  try {
    const params: any = {
      start: currentStart.value,
      end: currentEnd.value,
    }
    if (selectedRoomId.value) params.room_id = selectedRoomId.value

    const res = await fetchCalendarEvents(params, auth.authHeaders())
    events.value = (res.data || []).map(ev => {
      const color = getRoomColor(ev.room_id)
      const isPending = ev.status === 'pending'
      return {
        id: `${ev.id}-${ev.start}`,
        title: `${ev.room_name} - ${ev.activity_name || tr('Peminjaman', 'Booking')}`,
        start: ev.start,
        end: ev.end,
        backgroundColor: isPending ? '#fbbf24' : color.bg,
        borderColor: isPending ? '#f59e0b' : color.border,
        textColor: isPending ? '#78350f' : color.text,
        extendedProps: {
          booking_id: ev.booking_id,
          occurrence_id: ev.id,
          room_id: ev.room_id,
          room_name: ev.room_name,
          status: ev.status,
          booking_status: ev.booking_status,
          user_name: ev.user_name,
          activity_name: ev.activity_name,
          participant_count: ev.participant_count,
                  start_at: ev.start,
          end_at: ev.end,
},
      }
    })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat jadwal.', 'Failed to load schedule.')
  } finally {
    loading.value = false
  }
}

function refetchEvents() {
  fetchEvents()
}

function formatWibDateTime(value: string): string {

  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)

  if (!match) return String(value || '-')



  const [, y, mo, d, h, mi] = match

  return `${d} ${mo}-${y} ${h}:${mi}`

}



function formatEventTime(event: any) {

  const start = event?.extendedProps?.start_at

  const end = event?.extendedProps?.end_at



  if (!start) return '-'



  const startStr = formatWibDateTime(start)

  if (!end) return startStr



  const startDate = String(start).slice(0, 10)

  const endDate = String(end).slice(0, 10)



  if (startDate === endDate) {

    const endMatch = String(end).match(/[ T](\d{2}):(\d{2})/)

    const endTime = endMatch ? `${endMatch[1]}:${endMatch[2]}` : String(end)

    return `${startStr} - ${endTime}`

  }



  return `${startStr} - ${formatWibDateTime(end)}`

}

watch(selectedRoomId, () => {
  fetchEvents()
})

onMounted(() => {
  fetchRooms()
})
</script>

<style>
/* FullCalendar custom styles */
.fc .fc-toolbar-title {
  font-size: 1.25rem !important;
  font-weight: 700 !important;
}
.fc .fc-button {
  border-radius: 0.75rem !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 0.375rem 0.75rem !important;
}
.fc .fc-button-primary {
  background-color: #4f46e5 !important;
  border-color: #4f46e5 !important;
}
.fc .fc-button-primary:hover {
  background-color: #4338ca !important;
  border-color: #4338ca !important;
}
.fc .fc-button-primary:not(:disabled).fc-button-active,
.fc .fc-button-primary:not(:disabled):active {
  background-color: #3730a3 !important;
  border-color: #3730a3 !important;
}
.fc .fc-daygrid-event {
  border-radius: 0.375rem !important;
  padding: 2px 4px !important;
  font-size: 0.75rem !important;
}
.fc .fc-timegrid-event {
  border-radius: 0.375rem !important;
}
.fc .fc-event {
  cursor: pointer !important;
}
.fc .fc-day-today {
  background-color: #eef2ff !important;
}
@media (max-width: 640px) {
  .booking-calendar-shell .fc {
    min-width: 680px;
  }
  .fc .fc-toolbar {
    align-items: flex-start !important;
    gap: 0.5rem !important;
  }
  .fc .fc-toolbar-title {
    font-size: 1rem !important;
    line-height: 1.25rem !important;
  }
  .fc .fc-button {
    font-size: 0.75rem !important;
    padding: 0.25rem 0.5rem !important;
  }
  .fc .fc-daygrid-event {
    font-size: 0.6875rem !important;
    line-height: 1rem !important;
  }
}
</style>
