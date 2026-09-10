<template>
  <div ref="displayRoot" class="min-h-screen bg-slate-950 text-white overflow-hidden">
    <div class="h-screen flex flex-col p-8 gap-6">
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

      <main class="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6 min-h-0 flex-1">
        <section class="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
          <div class="px-6 py-4 bg-emerald-500 text-slate-950 font-black text-3xl">{{ tr('Sedang Digunakan', 'In Use Now') }}</div>
          <div class="divide-y divide-slate-800 overflow-hidden">
            <div v-for="item in currentItems" :key="item.occurrence_id" class="p-5 grid grid-cols-[150px_1fr] gap-5 items-center">
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
          <div class="px-6 py-4 bg-sky-400 text-slate-950 font-black text-3xl">{{ tr('Berikutnya', 'Up Next') }}</div>
          <div class="divide-y divide-slate-800 overflow-hidden">
            <div v-for="item in upcomingItems" :key="item.occurrence_id" class="p-5 grid grid-cols-[110px_1fr] gap-5 items-center">
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

const currentItems = computed(() => rows.value.filter((item) => item.is_current).slice(0, 4))
const upcomingItems = computed(() => rows.value.filter((item) => !item.is_current).slice(0, 8))

async function load() {
  const res = await fetchDisplayRooms(auth.authHeaders(), 6)
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
