<template>
  <div :class="viewerContainerClass">
    <div v-if="loading" class="text-center py-8">
      <Icon name="mdi:loading" class="animate-spin text-4xl text-blue-600" />
      <p class="mt-2 text-gray-600">{{ tr('Memuat PDF...', 'Loading PDF...') }}</p>
    </div>

    <div v-else-if="error" class="text-center py-8 text-red-600">
      <Icon name="mdi:alert-circle" class="text-4xl mb-2" />
      <p>{{ error }}</p>
    </div>

    <div v-else :class="isFullscreen ? `grid ${hasFullscreenActions ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'} h-full gap-0` : ''">
      <!-- Left: PDF panel -->
      <div :class="isFullscreen ? 'flex flex-col h-full overflow-hidden border-r border-gray-200' : 'border border-gray-300 rounded-2xl overflow-hidden bg-gray-100'">
        <div
          class="bg-white border-b border-gray-300 px-4 py-2 flex items-center justify-between"
          :class="isFullscreen ? 'border-t-0 border-l-0' : ''"
        >
          <div class="flex items-center gap-2">
            <button
              @click="previousPage"
              :disabled="currentPage <= 1"
              class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="mdi:chevron-left" />
            </button>
            <div class="flex items-center gap-1 text-sm text-gray-600">
              <span>{{ tr('Hal', 'Page') }}</span>
              <input
                v-model.number="pageInput"
                type="number"
                :min="1"
                :max="totalPages || 1"
                class="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                @keyup.enter.prevent="jumpToPage"
              />
              <span class="text-gray-500">/ {{ totalPages || 1 }}</span>
              <button
                @click="jumpToPage"
                :disabled="!canJump"
                class="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {{ tr('Go', 'Go') }}
              </button>
            </div>
            <button
              @click="nextPage"
              :disabled="currentPage >= totalPages"
              class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="mdi:chevron-right" />
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button @click="zoomOut" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
              <Icon name="mdi:minus" />
            </button>
            <span class="text-sm">{{ Math.round(scale * 100) }}%</span>
            <button @click="zoomIn" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
              <Icon name="mdi:plus" />
            </button>

            <div class="w-px h-6 bg-gray-300 mx-1" />

            <button
              @click="toggleFullscreen"
              class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 flex items-center gap-1 text-sm"
            >
              <Icon :name="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" size="18" />
              {{ isFullscreen ? tr('Keluar', 'Exit') : tr('Fullscreen', 'Fullscreen') }}
            </button>
          </div>
        </div>

        <div
          ref="scrollContainerRef"
          class="pdf-content"
          :class="isFullscreen ? 'flex-1 overflow-auto border-l-0 border-b-0' : 'overflow-auto'"
          :style="contentStyle"
        >
          <div ref="pdfContainerRef" class="pdf-container">
            <vue-pdf-embed
              v-if="urlPdf"
              :source="urlPdf"
              :page="currentPage"
              :scale="scale"
              @loaded="onPdfLoaded"
              @rendered="onPdfRendered"
            />
          </div>
        </div>
      </div>

      <!-- Right: Fullscreen action panel (slot from parent) -->
      <div v-if="isFullscreen && hasFullscreenActions" class="h-full overflow-y-auto bg-gray-50 p-5">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900">{{ tr('Panel Aksi', 'Action Panel') }}</h3>
          <button
            @click="toggleFullscreen"
            class="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition"
            :title="tr('Keluar Fullscreen', 'Exit Fullscreen')"
          >
            <Icon name="mdi:close" size="22" />
          </button>
        </div>

        <slot name="fullscreen-actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import VuePdfEmbed from 'vue-pdf-embed'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min?url'
const { tr } = useAppLocale()

GlobalWorkerOptions.workerSrc = workerSrc

const props = defineProps<{
  pdfData?: string
  maxHeight?: string
  urlR2?: string
}>()

const slots = useSlots()
const loading = ref(true)
const scrollContainerRef = ref<HTMLElement | null>(null)
const pdfContainerRef = ref<HTMLElement | null>(null)
const error = ref<string | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const urlPdf = ref<string | null>(null)
const pageInput = ref(1)
const initialFitDone = ref(false)
const baseWidth = ref(0)
const baseHeight = ref(0)

const isFullscreen = ref(false)
const hasFullscreenActions = computed(() => {
  return !!slots['fullscreen-actions']
})

const viewerContainerClass = computed(() => {
  if (!isFullscreen.value) return 'pdf-viewer-wrapper'
  return 'pdf-viewer-wrapper fixed inset-0 z-50 bg-white'
})

const contentStyle = computed(() => {
  if (isFullscreen.value) return {}
  return { maxHeight: props.maxHeight || '600px' }
})

async function loadPdf() {
  urlPdf.value = props.urlR2 || null
  loading.value = false
}

const onPdfLoaded = (event: any) => {
  totalPages.value = event._pdfInfo.numPages || 0
  currentPage.value = 1
  pageInput.value = 1
}

onMounted(() => {
  loadPdf().catch((err: any) => {
    error.value = err?.message || tr('Gagal memuat PDF', 'Failed to load PDF')
    loading.value = false
  })
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.body.style.overflow = ''
})

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

const onPdfRendered = () => {
  loading.value = false
  nextTick(() => {
    if (!pdfContainerRef.value) return

    const canvas = pdfContainerRef.value.querySelector('canvas')
    if (!canvas) return

    if (!initialFitDone.value) {
      baseWidth.value = canvas.width
      baseHeight.value = canvas.height
      initialFitDone.value = true
    }
  })
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  document.body.style.overflow = isFullscreen.value ? 'hidden' : ''
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.1, 3.0)
  const canvas = pdfContainerRef.value?.querySelector('canvas')
  if (!canvas) return
  canvas.style.width = (baseWidth.value * scale.value) + 'px'
  canvas.style.height = (baseHeight.value * scale.value) + 'px'
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.1, 0.5)
  const canvas = pdfContainerRef.value?.querySelector('canvas')
  if (!canvas) return
  canvas.style.width = (baseWidth.value * scale.value) + 'px'
  canvas.style.height = (baseHeight.value * scale.value) + 'px'
}

const canJump = computed(() => {
  const target = Number(pageInput.value)
  if (!Number.isFinite(target)) return false
  if (target < 1) return false
  if (!totalPages.value) return false
  return target <= totalPages.value
})

const jumpToPage = () => {
  if (!canJump.value) return
  const target = Math.trunc(pageInput.value)
  currentPage.value = Math.min(Math.max(target, 1), totalPages.value)
  pageInput.value = currentPage.value
}

watch(currentPage, (val) => {
  pageInput.value = val
})

watch(
  () => [props.urlR2, props.pdfData],
  () => {
    loading.value = true
    error.value = null
    initialFitDone.value = false
    currentPage.value = 1
    pageInput.value = 1
    loadPdf()
  },
)
</script>

<style scoped>
.pdf-container {
  width: fit-content;
  margin: 0 auto;
}

.pdf-container :deep(canvas) {
  display: block;
  max-width: none !important;
  max-height: none !important;
}
</style>
