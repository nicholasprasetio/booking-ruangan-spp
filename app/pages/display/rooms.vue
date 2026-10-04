<template>
  <div ref="displayRoot" class="min-h-screen bg-slate-950 text-white overflow-hidden">
    <div class="display-shell h-screen flex flex-col">
      <header class="flex items-end justify-between gap-6">
        <div>
          <div class="text-sky-300 text-2xl font-semibold">{{ tr('Jadwal Penggunaan Ruangan', 'Room Usage Schedule') }}</div>
          <div class="text-6xl font-black tracking-normal">{{ clock }}</div>
        </div>
        <div class="flex items-center gap-4 text-right text-slate-300">
          <div>
            <!-- <div>Auto refresh 60 detik</div> -->
            <div>{{ formatDate(nowIso) }}</div>
          </div>
          <button
            type="button"
            class="display-action inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-100 transition hover:border-sky-300 hover:text-sky-200"
            :title="isFullscreen ? tr('Keluar fullscreen', 'Exit fullscreen') : tr('Fullscreen', 'Fullscreen')"
            :aria-label="isFullscreen ? tr('Keluar fullscreen', 'Exit fullscreen') : tr('Fullscreen', 'Fullscreen')"
            @click="toggleFullscreen"
          >
            <Icon :name="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" size="28" />
          </button>
        </div>
      </header>

      <main class="display-main grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] min-h-0 flex-1">
        <section class="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
          <div class="display-section-title px-6 py-4 bg-emerald-500 text-slate-950 font-black text-3xl">{{ tr('Sedang Digunakan', 'In Use Now') }}</div>
          <div class="display-list divide-y divide-slate-800">
            <div v-for="item in currentItems" :key="item.occurrence_id" class="display-row grid items-center">
              <div class="text-3xl font-black text-emerald-300">
                {{ timeOnly(item.start_at) }} - {{ timeOnly(item.end_at) }}
              </div>
              <div class="min-w-0">
                <div class="marquee text-4xl font-black leading-tight">
                  <span class="marquee-content">{{ item.room_name }}</span>
                </div>
                <div class="marquee mt-2 text-2xl text-slate-200">
                  <span class="marquee-content">{{ item.activity_name || tr('Peminjaman Ruangan', 'Room Booking') }}</span>
                </div>
              </div>
            </div>
            <div v-if="currentItems.length === 0" class="p-10 text-4xl text-slate-400">{{ tr('Tidak ada ruangan yang sedang digunakan.', 'No rooms are currently in use.') }}</div>
          </div>
        </section>

        <section class="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
          <div class="display-section-title px-6 py-4 bg-sky-400 text-slate-950 font-black text-3xl">{{ tr('Berikutnya', 'Up Next') }}</div>
          <div class="divide-y divide-slate-800 overflow-hidden">
            <div v-for="item in upcomingItems" :key="item.occurrence_id" class="display-row upcoming-row grid items-center">
              <div class="text-4xl font-black text-sky-300">{{ timeOnly(item.start_at) }}</div>
              <div class="min-w-0">
                <div class="marquee text-3xl font-bold">
                  <span class="marquee-content">{{ item.room_name }}</span>
                </div>
                <div class="marquee text-xl text-slate-300">
                  <span class="marquee-content">{{ item.activity_name || tr('Peminjaman Ruangan', 'Room Booking') }}</span>
                </div>
              </div>
            </div>
            <div v-if="upcomingItems.length === 0" class="p-10 text-3xl text-slate-400">{{ tr('Tidak ada jadwal beberapa jam ke depan.', 'No schedules in the next few hours.') }}</div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchDisplayRooms } from '~/services/displayRooms'

definePageMeta({ layout: false })

const auth = useAuth()
auth.loadFromStorage()
const { tr, localeTag } = useAppLocale()

const rows = ref<any[]>([])
const nowIso = ref(new Date().toISOString())
const clock = ref('')
const displayRoot = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null
let marqueeObserver: ResizeObserver | null = null

const currentItems = computed(() => rows.value.filter((item) => item.is_current).slice(0, 6))
const upcomingItems = computed(() => rows.value.filter((item) => !item.is_current).slice(0, 12))

async function load() {
  const res = await fetchDisplayRooms(auth.authHeaders(), 12)
  rows.value = res.data || []
  nowIso.value = res.now
  refreshMarquees()
}

function tickClock() {
  clock.value = new Date().toLocaleTimeString(localeTag.value, { hour: '2-digit', minute: '2-digit' })
}

function timeOnly(value: string) {

  const match = String(value || '').match(/[ T](\d{2}):(\d{2})/)

  return match ? `${match[1]}:${match[2]}` : '-'

}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(localeTag.value, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await displayRoot.value?.requestFullscreen()
  } else {
    await document.exitFullscreen()
  }
}

function syncFullscreenState() {
  isFullscreen.value = !!document.fullscreenElement
  refreshMarquees()
}

function refreshMarquees() {
  nextTick(() => {
    const marqueeEls = displayRoot.value?.querySelectorAll<HTMLElement>('.marquee') || []

    for (const el of marqueeEls) {
      const content = el.querySelector('.marquee-content') as HTMLElement | null
      if (!content) continue

      content.style.removeProperty('--marquee-distance')
      content.style.removeProperty('--marquee-duration')
      el.classList.remove('is-overflowing')

      // The text itself must retain its intrinsic width; otherwise an ellipsis
      // makes the measured width equal to the container and prevents scrolling.
      const distance = Math.ceil(content.getBoundingClientRect().width - el.clientWidth)
      if (distance > 4) {
        content.style.setProperty('--marquee-distance', `${distance + 32}px`)
        content.style.setProperty('--marquee-duration', `${Math.max(8, Math.min(24, distance / 24))}s`)
        el.classList.add('is-overflowing')
      }
    }
  })
}

onMounted(() => {
  tickClock()
  load()
  syncFullscreenState()
  marqueeObserver = new ResizeObserver(refreshMarquees)
  if (displayRoot.value) marqueeObserver.observe(displayRoot.value)
  document.addEventListener('fullscreenchange', syncFullscreenState)
  window.addEventListener('resize', refreshMarquees)
  clockTimer = setInterval(tickClock, 1000)
  refreshTimer = setInterval(load, 60000)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
  window.removeEventListener('resize', refreshMarquees)
  marqueeObserver?.disconnect()
  if (clockTimer) clearInterval(clockTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})

watch(rows, refreshMarquees, { deep: true })
</script>

<style scoped>
.marquee {
  overflow: hidden;
  white-space: nowrap;
}

.marquee-content {
  display: inline-block;
  width: max-content;
  min-width: 100%;
  vertical-align: top;
}

.marquee.is-overflowing .marquee-content {
  animation: display-marquee var(--marquee-duration, 12s) ease-in-out infinite alternate;
}



.display-shell {

  padding: clamp(1rem, 2vw, 2rem);

  gap: clamp(.75rem, 1.4vw, 1.5rem);

}



.display-main {

  gap: clamp(.75rem, 1.4vw, 1.5rem);

}



.display-list {

  flex: 1;

  min-height: 0;

  display: grid;

  grid-auto-rows: minmax(0, 1fr);

  overflow: hidden;

}



.display-row {

  min-height: 0;

  grid-template-columns: clamp(82px, 10vw, 150px) minmax(0, 1fr);

  gap: clamp(.5rem, .9vw, 1.25rem);

  padding: clamp(.4rem, 1vh, 1rem) clamp(.6rem, 1vw, 1.25rem);

}



@media (max-height: 800px) {

  .display-shell {

    padding: 1rem;

    gap: .75rem;

  }



  .display-main {

    gap: .75rem;

  }



  .display-section-title {

    padding: .65rem 1rem !important;

    font-size: 1.35rem !important;

  }



  .display-row {

    padding: .35rem .7rem;

  }



  .current-time {

    font-size: clamp(1rem, 2.7vh, 1.7rem);

  }



  .current-room {

    font-size: clamp(1.05rem, 3vh, 1.8rem);

  }



  .current-activity {

    font-size: clamp(.7rem, 1.9vh, 1.15rem);

  }



  .upcoming-time {

    font-size: clamp(.9rem, 2.5vh, 1.5rem);

  }



  .upcoming-room {

    font-size: clamp(.95rem, 2.7vh, 1.6rem);

  }



  .upcoming-activity {

    font-size: clamp(.65rem, 1.7vh, 1rem);

  }

}




@media (max-width: 767px) {

  .display-shell {

    min-height: 100dvh;

    height: auto !important;

    padding: .75rem;

    gap: .75rem;

  }



  .display-main {

    display: flex !important;

    flex-direction: column;

    gap: .75rem;

    flex: none !important;

    min-height: auto !important;

  }



  .display-main > section {

    flex: none;

    min-height: 0;

  }



  .display-section-title {

    padding: .75rem 1rem !important;

    font-size: 1.35rem !important;

  }



  .display-list {

    display: flex !important;

    flex-direction: column;

    flex: none;

    min-height: 0;

    overflow: visible;

  }



  .display-row {

    display: grid;

    grid-template-columns: 82px minmax(0, 1fr);

    gap: .6rem;

    min-height: 82px;

    padding: .65rem .75rem;

    align-items: center;

  }



  .display-row > div:first-child {

    font-size: clamp(1rem, 4.2vw, 1.45rem) !important;

    line-height: 1.1;

    white-space: nowrap;

  }



  .display-row .marquee {

    font-size: clamp(1rem, 4.3vw, 1.45rem) !important;

    line-height: 1.2;

  }



  .display-row .marquee.text-2xl,

  .display-row .marquee.text-xl {

    font-size: clamp(.78rem, 3.1vw, 1rem) !important;

    margin-top: .15rem !important;

  }



  .display-row.upcoming-row {

    min-height: 76px;

  }



  .display-row.upcoming-row > div:first-child {

    font-size: clamp(1rem, 4.4vw, 1.4rem) !important;

  }



  .display-row.upcoming-row .marquee {

    font-size: clamp(.95rem, 4vw, 1.3rem) !important;

  }



  .display-row.upcoming-row .marquee.text-xl {

    font-size: clamp(.72rem, 2.9vw, .95rem) !important;

  }

}



@media (min-width: 768px) and (max-height: 800px) {

  .display-row {

    min-height: 0;

  }

}


:fullscreen .display-action {
  opacity: 0;
  pointer-events: none;
}

@keyframes display-marquee {
  0% {
    transform: translateX(0);
  }

  18% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(calc(-1 * var(--marquee-distance, 0px)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee.is-overflowing .marquee-content {
    animation: none;
  }
}
</style>
