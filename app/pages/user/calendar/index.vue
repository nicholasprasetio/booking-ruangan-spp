<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ tr('Kalender Peminjaman Saya', 'My Booking Calendar') }}</h1>
            <p class="text-gray-600 mt-1">{{ tr('Lihat dan atur peminjaman Anda.', 'View and manage your bookings.') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="statusFilter"
              class="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"
            >
              <option value="pending,approved">{{ tr('Menunggu + Disetujui', 'Pending + Approved') }}</option>
              <option value="pending">{{ tr('Menunggu', 'Pending') }}</option>
              <option value="approved">{{ tr('Disetujui', 'Approved') }}</option>
              <option value="pending,approved,rejected,completed,canceled">{{ tr('Semua Status', 'All Statuses') }}</option>
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

        <div class="flex flex-wrap items-center gap-4 mb-4 text-sm">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
            <span class="text-gray-600">{{ tr('Menunggu', 'Pending') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span class="text-gray-600">{{ tr('Disetujui', 'Approved') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            <span class="text-gray-600">{{ tr('Ditolak', 'Rejected') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-slate-500 inline-block"></span>
            <span class="text-gray-600">{{ tr('Selesai / Dibatalkan', 'Completed / Canceled') }}</span>
          </div>
        </div>

        <div v-if="loading && !calendarReady" class="bg-white rounded-3xl shadow p-10 text-center text-gray-600">
          {{ tr('Memuat kalender...', 'Loading calendar...') }}
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-4">
          {{ error }}
        </div>

        <div class="booking-calendar-shell w-full min-w-0 max-w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-3 sm:p-4">

  <div class="mobile-calendar-view">

    <div class="mobile-calendar-toolbar">

      <div class="flex items-center gap-2">

        <button type="button" class="mobile-calendar-nav" @click="mobilePrev">‹</button>

        <button type="button" class="mobile-calendar-nav" @click="mobileNext">›</button>

        <button type="button" class="mobile-calendar-today" @click="mobileToday">

          {{ tr('Hari Ini', 'Today') }}

        </button>

      </div>



      <div class="mobile-calendar-title">

        {{ mobileCalendarTitle }}

      </div>

    </div>



    <div v-if="mobileCalendarGroups.length" class="mobile-calendar-groups">

      <section

        v-for="group in mobileCalendarGroups"

        :key="group.date"

        class="mobile-calendar-day"

      >

        <div class="mobile-calendar-day-title">

          {{ group.label }}

        </div>



        <button

          v-for="event in group.events"

          :key="String(event.id)"

          type="button"

          class="mobile-calendar-event"

          @click="openMobileEvent(event)"

        >

          <span

            class="mobile-calendar-dot"

            :style="{ backgroundColor: String(event.backgroundColor || '#10b981') }"

          ></span>



          <div class="mobile-calendar-event-body">

            <div class="mobile-calendar-event-time">

              {{ mobileEventTime(event) }}

            </div>



            <div class="mobile-calendar-event-room">

              {{ event.extendedProps?.room_name || tr('Ruangan', 'Room') }}

            </div>



            <div class="mobile-calendar-event-activity">

              {{ event.extendedProps?.activity_name || tr('Peminjaman Ruangan', 'Room Booking') }}

            </div>

          </div>

        </button>

      </section>

    </div>



    <div v-else class="mobile-calendar-empty">

      {{ tr('Tidak ada jadwal pada bulan ini.', 'No bookings this month.') }}

    </div>

  </div>



  <div class="desktop-calendar-view">

    <FullCalendar ref="calendarRef" :options="calendarOptions" />

  </div>

</div>
      </div>
    </div>

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
              <Icon name="mdi:check-circle" class="mt-0.5" :class="statusIconClass(selectedEvent.extendedProps.status)" size="20" />
              <div>
                <div class="text-xs font-semibold text-gray-500 uppercase">{{ tr('Status', 'Status') }}</div>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="statusBadgeClass(selectedEvent.extendedProps.status)">
                  {{ statusLabel(selectedEvent.extendedProps.status) }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-2 justify-end">
            <NuxtLink
              :to="`/bookings/${selectedEvent.extendedProps.booking_id}`"
              class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              {{ tr('Detail Booking', 'Booking Detail') }}
            </NuxtLink>
            <button
              v-if="canRescheduleOccurrence(selectedEvent)"
              class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
              @click="goRescheduleOccurrence(selectedEvent)"
            >
              {{ tr('Reschedule 1', 'Reschedule 1') }}
            </button>
            <button
              v-if="canRecurringAllAction(selectedEvent)"
              class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
              @click="goRescheduleAll(selectedEvent)"
            >
              {{ tr('Reschedule Semua', 'Reschedule All') }}
            </button>
            <button
              v-if="canCancelOccurrence(selectedEvent)"
              class="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
              @click="cancelOccurrence(selectedEvent)"
            >
              {{ tr('Batalkan Tanggal Ini', 'Cancel This Date') }}
            </button>
            <button
              v-if="canRecurringAllAction(selectedEvent)"
              class="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition"
              @click="cancelAllRecurring(selectedEvent)"
            >
              {{ tr('Batalkan Semua', 'Cancel All') }}
            </button>
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
import Swal from 'sweetalert2'
import { cancelBooking, cancelBookingSeries, fetchUserCalendarEvents } from '~/services/bookings'

const auth = useAuth()
const { tr, calendarLocale, localeTag } = useAppLocale()
auth.loadFromStorage()

const loading = ref(false)
const error = ref<string | null>(null)
const calendarReady = ref(false)
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)

const statusFilter = ref('pending,approved')
const events = ref<EventInput[]>([])

const showEventDetail = ref(false)
const selectedEvent = ref<any>(null)

const currentStart = ref<string>('')
const currentEnd = ref<string>('')



const mobileCalendarDate = ref(new Date())



const mobileCalendarTitle = computed(() =>

  mobileCalendarDate.value.toLocaleDateString(localeTag.value, {

    month: 'long',

    year: 'numeric',

  }),

)



function syncMobileCalendarDate() {

  const api = calendarRef.value?.getApi()

  const date = api?.getDate()



  if (date) {

    mobileCalendarDate.value = new Date(date)

  }

}



const mobileCalendarGroups = computed(() => {

  const year = mobileCalendarDate.value.getFullYear()

  const month = String(mobileCalendarDate.value.getMonth() + 1).padStart(2, '0')

  const monthKey = `${year}-${month}`



  const grouped = new Map<string, EventInput[]>()



  for (const event of events.value) {

    const date = String(event.start || '').replace('T', ' ').slice(0, 10)



    if (!date || !date.startsWith(monthKey)) continue



    if (!grouped.has(date)) {

      grouped.set(date, [])

    }



    grouped.get(date)!.push(event)

  }



  return Array.from(grouped.entries())

    .sort(([a], [b]) => a.localeCompare(b))

    .map(([date, dayEvents]) => {

      const [y, m, d] = date.split('-').map(Number)



      const label = new Date(y, m - 1, d).toLocaleDateString(localeTag.value, {

        weekday: 'long',

        day: 'numeric',

        month: 'long',

        year: 'numeric',

      })



      return {

        date,

        label,

        events: [...dayEvents].sort((a, b) =>

          String(a.start || '').localeCompare(String(b.start || '')),

        ),

      }

    })

})



function mobileEventTime(event: EventInput) {

  const start = String(event.start || '').replace('T', ' ')

  const end = String(event.end || '').replace('T', ' ')



  const startMatch = start.match(/[ T](\d{2}):(\d{2})/)

  const endMatch = end.match(/[ T](\d{2}):(\d{2})/)



  const startTime = startMatch ? `${startMatch[1]}:${startMatch[2]}` : '-'

  const endTime = endMatch ? `${endMatch[1]}:${endMatch[2]}` : ''



  return endTime ? `${startTime} - ${endTime}` : startTime

}



function openMobileEvent(event: EventInput) {

  selectedEvent.value = {

    ...event,

    extendedProps: {

      ...(event.extendedProps || {}),

      start_at: event.start,

      end_at: event.end,

    },

  }



  showEventDetail.value = true

}



function mobilePrev() {

  const api = calendarRef.value?.getApi()

  if (!api) return



  api.prev()

  syncMobileCalendarDate()

}



function mobileNext() {

  const api = calendarRef.value?.getApi()

  if (!api) return



  api.next()

  syncMobileCalendarDate()

}



function mobileToday() {

  const api = calendarRef.value?.getApi()

  if (!api) return



  api.today()

  syncMobileCalendarDate()

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

function statusLabel(status: string) {
  if (status === 'approved') return tr('Disetujui', 'Approved')
  if (status === 'rejected') return tr('Ditolak', 'Rejected')
  if (status === 'completed') return tr('Selesai', 'Completed')
  if (status === 'canceled') return tr('Dibatalkan', 'Canceled')
  return tr('Menunggu', 'Pending')
}

function statusIconClass(status: string) {
  if (status === 'approved') return 'text-emerald-500'
  if (status === 'rejected') return 'text-red-500'
  if (status === 'completed') return 'text-slate-500'
  if (status === 'canceled') return 'text-slate-500'
  return 'text-amber-500'
}

function statusBadgeClass(status: string) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-800'
  if (status === 'rejected') return 'bg-red-50 text-red-700'
  if (status === 'completed') return 'bg-slate-100 text-slate-700'
  if (status === 'canceled') return 'bg-slate-100 text-slate-700'
  return 'bg-amber-50 text-amber-800'
}

function eventColor(status: string) {
  if (status === 'approved') {
    return { bg: '#10b981', border: '#059669', text: '#ffffff' }
  }
  if (status === 'rejected') {
    return { bg: '#ef4444', border: '#dc2626', text: '#ffffff' }
  }
  if (status === 'completed' || status === 'canceled') {
    return { bg: '#64748b', border: '#475569', text: '#ffffff' }
  }
  return { bg: '#f59e0b', border: '#d97706', text: '#78350f' }
}

function handleDatesSet(arg: DatesSetArg) {
  const start = arg.startStr.slice(0, 10)
  const end = arg.endStr.slice(0, 10)
  if (start !== currentStart.value || end !== currentEnd.value) {
    currentStart.value = start
    currentEnd.value = end
    syncMobileCalendarDate()
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

async function fetchEvents() {
  if (!currentStart.value || !currentEnd.value) return
  loading.value = true
  error.value = null
  try {
    const res = await fetchUserCalendarEvents(
      {
        start: currentStart.value,
        end: currentEnd.value,
        status: statusFilter.value,
      },
      auth.authHeaders(),
    )

    events.value = (res.data || []).map((ev: any) => {
      const color = eventColor(ev.status)
      return {
        id: `${ev.id}-${ev.start}`,
        title: `${ev.room_name || tr('Ruangan', 'Room')} - ${ev.activity_name || tr('Peminjaman', 'Booking')}`,
        start: ev.start,
        end: ev.end,
        backgroundColor: color.bg,
        borderColor: color.border,
        textColor: color.text,
        extendedProps: {
          occurrence_id: ev.id,
          booking_id: ev.booking_id,
          room_id: ev.room_id,
          room_name: ev.room_name,
          status: ev.status,
          booking_status: ev.booking_status,
          activity_name: ev.activity_name,
          participant_count: ev.participant_count,
          is_recurring: ev.is_recurring,
                  start_at: ev.start,
          end_at: ev.end,
},
      }
    })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat kalender.', 'Failed to load calendar.')
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

function canCancelOccurrence(event: any) {
  const status = event?.extendedProps?.status
  return status === 'pending' || status === 'approved'
}

function canRescheduleOccurrence(event: any) {
  const status = event?.extendedProps?.status
  return status === 'pending' || status === 'approved' || status === 'rejected'
}

function canRecurringAllAction(event: any) {
  return Boolean(event?.extendedProps?.is_recurring)
}

async function cancelOccurrence(event: any) {
  const bookingId = Number(event?.extendedProps?.booking_id)
  const occurrenceId = Number(event?.extendedProps?.occurrence_id)
  if (!bookingId || !occurrenceId) return

  const res = await Swal.fire({
    title: tr(`Batalkan: ${formatEventTime(event)}?`, `Cancel: ${formatEventTime(event)}?`),
    input: 'textarea',
    inputPlaceholder: tr('Alasan (opsional)', 'Reason (optional)'),
    showCancelButton: true,
    confirmButtonText: tr('Ya, batalkan', 'Yes, cancel it'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
  })
  if (!res.isConfirmed) return

  try {
    await cancelBooking(
      bookingId,
      {
        occurrenceId,
        scope: 'occurrence',
        reason: typeof res.value === 'string' ? res.value.trim() : '',
      },
      auth.authHeaders(),
    )
    await Swal.fire({ icon: 'success', title: tr('Dibatalkan', 'Canceled'), timer: 900, showConfirmButton: false })
    closeEventDetail()
    await fetchEvents()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal membatalkan peminjaman.', 'Failed to cancel booking.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  }
}

async function cancelAllRecurring(event: any) {
  const bookingId = Number(event?.extendedProps?.booking_id)
  if (!bookingId) return

  const res = await Swal.fire({
    title: tr('Batalkan semua booking berulang?', 'Cancel all recurring bookings?'),
    input: 'textarea',
    inputPlaceholder: tr('Alasan (opsional)', 'Reason (optional)'),
    showCancelButton: true,
    confirmButtonText: tr('Ya, batalkan semua', 'Yes, cancel all'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
  })
  if (!res.isConfirmed) return

  try {
    await cancelBookingSeries(bookingId, { reason: typeof res.value === 'string' ? res.value.trim() : '' }, auth.authHeaders())
    await Swal.fire({ icon: 'success', title: tr('Dibatalkan', 'Canceled'), timer: 900, showConfirmButton: false })
    closeEventDetail()
    await fetchEvents()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal membatalkan booking berulang.', 'Failed to cancel recurring booking.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  }
}

async function goRescheduleOccurrence(event: any) {
  const roomId = Number(event?.extendedProps?.room_id)
  const bookingId = Number(event?.extendedProps?.booking_id)
  const occurrenceId = Number(event?.extendedProps?.occurrence_id)
  if (!roomId || !bookingId || !occurrenceId) return

  closeEventDetail()
  await navigateTo(`/user/book-room/request/${roomId}?reschedule=${bookingId}&occurrence=${occurrenceId}`)
}

async function goRescheduleAll(event: any) {
  const roomId = Number(event?.extendedProps?.room_id)
  const bookingId = Number(event?.extendedProps?.booking_id)
  if (!roomId || !bookingId) return

  closeEventDetail()
  await navigateTo(`/user/book-room/request/${roomId}?rescheduleSeries=${bookingId}`)
}

watch(statusFilter, () => {

  fetchEvents()

})



if (import.meta.client) {

  const handleCalendarFocus = () => fetchEvents()



  const handleCalendarVisibility = () => {

    if (document.visibilityState === 'visible') fetchEvents()

  }



  const handleCalendarPageShow = () => fetchEvents()



  window.addEventListener('focus', handleCalendarFocus)

  window.addEventListener('pageshow', handleCalendarPageShow)

  document.addEventListener('visibilitychange', handleCalendarVisibility)

}


</script>

<style>


.mobile-calendar-view {

  display: none;

}



.desktop-calendar-view {

  display: block;

}



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

  .booking-calendar-shell {

    display: block;

    width: 100%;

    max-width: 100%;

    min-width: 0;

    overflow: hidden !important;

    padding: 0.65rem !important;

  }



  .mobile-calendar-view {

    display: block !important;

    width: 100%;

  }



  .desktop-calendar-view {

    display: none !important;

  }



  .mobile-calendar-toolbar {

    display: flex;

    flex-direction: column;

    gap: 0.7rem;

    margin-bottom: 0.8rem;

  }



  .mobile-calendar-toolbar > div:first-child {

    display: flex;

    align-items: center;

    gap: 0.45rem;

  }



  .mobile-calendar-nav {

    width: 42px;

    height: 40px;

    border: 0;

    border-radius: 0.7rem;

    background: #4f46e5;

    color: #fff;

    font-size: 1.7rem;

    line-height: 1;

    font-weight: 700;

  }



  .mobile-calendar-today {

    min-height: 40px;

    padding: 0 0.85rem;

    border: 0;

    border-radius: 0.7rem;

    background: #8b7cf0;

    color: #fff;

    font-size: 0.78rem;

    font-weight: 700;

  }



  .mobile-calendar-title {

    text-align: center;

    color: #111827;

    font-size: 1rem;

    font-weight: 800;

    text-transform: capitalize;

  }



  .mobile-calendar-groups {

    display: flex;

    flex-direction: column;

    gap: 0.75rem;

  }



  .mobile-calendar-day {

    overflow: hidden;

    border: 1px solid #e5e7eb;

    border-radius: 0.9rem;

    background: #fff;

  }



  .mobile-calendar-day-title {

    padding: 0.7rem 0.8rem;

    background: #f5f7ff;

    color: #111827;

    font-size: 0.84rem;

    font-weight: 800;

    line-height: 1.3;

    text-transform: capitalize;

  }



  .mobile-calendar-event {

    width: 100%;

    display: flex;

    align-items: flex-start;

    gap: 0.6rem;

    padding: 0.75rem 0.8rem;

    border: 0;

    border-top: 1px solid #f1f5f9;

    background: #fff;

    text-align: left;

  }



  .mobile-calendar-event:active {

    background: #f8fafc;

  }



  .mobile-calendar-dot {

    flex: 0 0 9px;

    width: 9px;

    height: 9px;

    margin-top: 0.38rem;

    border-radius: 999px;

  }



  .mobile-calendar-event-body {

    min-width: 0;

    flex: 1;

  }



  .mobile-calendar-event-time {

    margin-bottom: 0.2rem;

    color: #4f46e5;

    font-size: 0.73rem;

    font-weight: 800;

  }



  .mobile-calendar-event-room {

    color: #111827;

    font-size: 0.85rem;

    font-weight: 800;

    line-height: 1.35;

    white-space: normal;

    overflow: visible;

    overflow-wrap: anywhere;

    word-break: break-word;

  }



  .mobile-calendar-event-activity {

    margin-top: 0.15rem;

    color: #475569;

    font-size: 0.78rem;

    line-height: 1.4;

    white-space: normal;

    overflow: visible;

    overflow-wrap: anywhere;

    word-break: break-word;

  }



  .mobile-calendar-empty {

    padding: 2rem 1rem;

    text-align: center;

    color: #64748b;

    font-size: 0.9rem;

  }

}


</style>
