<template>
  <div :class="editorContainerClass">
    <!-- Fullscreen grid layout -->
    <div :class="isFullscreen ? 'grid grid-cols-[1fr_380px] h-full gap-0' : ''">
      <!-- Left: PDF editor panel -->
      <div :class="isFullscreen ? 'flex flex-col h-full overflow-hidden border-r border-gray-200' : ''">
        <div class="bg-white border border-gray-300 px-4 py-3 flex flex-wrap items-center gap-3"
          :class="isFullscreen ? 'rounded-none border-t-0 border-l-0' : 'rounded-t-2xl'"
        >
          <div class="flex items-center gap-2">
            <button
              @click="showDrawPanel = true"
              class="px-3 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition flex items-center gap-1"
            >
              <Icon name="mdi:draw" size="18" />
              {{ tr('Gambar TTD', 'Draw Signature') }}
            </button>
            <label
              class="px-3 py-2 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-700 transition flex items-center gap-1 cursor-pointer"
            >
              <Icon name="mdi:upload" size="18" />
              {{ tr('Upload TTD', 'Upload Signature') }}
              <input type="file" accept="image/*" class="hidden" @change="handleImageUpload" />
            </label>
            <button
              v-if="defaultSignatureImageData"
              @click="useDefaultSignature"
              class="px-3 py-2 bg-sky-600 text-white text-sm rounded-xl hover:bg-sky-700 transition flex items-center gap-1"
            >
              <Icon name="mdi:account-check" size="18" />
              {{ tr('Gunakan Signature Profil', 'Use Profile Signature') }}
            </button>
          </div>

          <div class="w-px h-8 bg-gray-300" />

          <div class="flex items-center gap-2">
            <button
              @click="prevPage"
              :disabled="currentPage <= 1"
              class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="mdi:chevron-left" />
            </button>
            <div class="flex items-center gap-1 text-sm">
              <span>{{ tr('Hal', 'Page') }}</span>
              <input
                v-model.number="pageInput"
                type="number"
                :min="1"
                :max="totalPages || 1"
                class="w-14 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                @keyup.enter="jumpToPage"
              />
              <span class="text-gray-500">/ {{ totalPages || 1 }}</span>
            </div>
            <button
              @click="nextPage"
              :disabled="currentPage >= totalPages"
              class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="mdi:chevron-right" />
            </button>
          </div>

          <div class="w-px h-8 bg-gray-300" />

          <div class="flex items-center gap-2">
            <button @click="zoomOut" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">
              <Icon name="mdi:minus" />
            </button>
            <span class="text-sm w-12 text-center">{{ Math.round(scale * 100) }}%</span>
            <button @click="zoomIn" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">
              <Icon name="mdi:plus" />
            </button>
          </div>

          <div class="flex-1" />

          <div class="flex items-center gap-2">
            <button
              @click="toggleFullscreen"
              class="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition flex items-center gap-1"
            >
              <Icon :name="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" size="18" />
              {{ isFullscreen ? tr('Keluar', 'Exit') : tr('Fullscreen', 'Fullscreen') }}
            </button>
            <button
              v-if="signatures.length > 0"
              @click="clearAllSignatures"
              class="px-3 py-2 bg-red-100 text-red-700 text-sm rounded-xl hover:bg-red-200 transition flex items-center gap-1"
            >
              <Icon name="mdi:delete-sweep" size="18" />
              {{ tr('Hapus Semua', 'Clear All') }}
            </button>
            <button
              @click="exportSignedPdf"
              :disabled="signatures.length === 0 || exporting"
              class="px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon :name="exporting ? 'mdi:loading' : 'mdi:file-download'" size="18" :class="{ 'animate-spin': exporting }" />
              {{ exporting ? tr('Mengekspor...', 'Exporting...') : tr('Ekspor PDF', 'Export PDF') }}
            </button>
          </div>
        </div>

        <div
          ref="scrollContainerRef"
          class="border border-t-0 border-gray-300 bg-gray-100 overflow-auto"
          :class="isFullscreen ? 'flex-1 rounded-none border-l-0 border-b-0' : 'rounded-b-2xl'"
          :style="contentStyle"
        >
          <div ref="pdfContainerRef" class="pdf-page-container relative" :class="isFullscreen ? 'my-4 mx-auto' : 'm-4'" @dragover.prevent @drop="handleDropOnPdf">
            <vue-pdf-embed
              v-if="pdfSource"
              ref="pdfRef"
              :source="pdfSource"
              :page="currentPage"
              :scale="scale"
              @loaded="onPdfLoaded"
              @rendered="onPdfRendered"
            />

            <div
              v-for="sig in currentPageSignatures"
              :key="sig.id"
              class="signature-overlay absolute border-2 border-dashed cursor-move group"
              :class="selectedSignature === sig.id ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent hover:border-blue-400'"
              :style="{
                left: sig.x + 'px',
                top: sig.y + 'px',
                width: sig.width + 'px',
                height: sig.height + 'px',
              }"
              @mousedown.prevent="startDrag($event, sig)"
              @click.stop="selectedSignature = sig.id"
            >
              <img :src="sig.imageData" class="w-full h-full object-contain pointer-events-none" draggable="false" />

              <button
                @click.stop="removeSignature(sig.id)"
                class="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-red-600"
              >
                <Icon name="mdi:close" size="14" />
              </button>

              <div
                class="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-100 transition rounded-tl"
                @mousedown.stop.prevent="startResize($event, sig)"
              />
            </div>
          </div>
        </div>

        <div v-if="signatures.length > 0 && !isFullscreen" class="mt-3 bg-white border border-gray-300 rounded-2xl p-3">
          <h4 class="text-sm font-medium text-gray-700 mb-2">{{ tr('Signature pada Dokumen', 'Signatures on Document') }} ({{ signatures.length }})</h4>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="sig in signatures"
              :key="sig.id"
              class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm border"
              :class="sig.page === currentPage ? 'border-blue-300 bg-blue-50' : 'border-gray-200'"
            >
              <img :src="sig.imageData" class="w-8 h-8 object-contain border rounded" />
              <span class="text-gray-600">{{ tr('Hal.', 'Pg.') }} {{ sig.page }}</span>
              <button @click="goToSignature(sig)" class="text-blue-500 hover:text-blue-700">
                <Icon name="mdi:eye" size="16" />
              </button>
              <button @click="removeSignature(sig.id)" class="text-red-500 hover:text-red-700">
                <Icon name="mdi:close" size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Fullscreen action panel (slot from parent) -->
      <div v-if="isFullscreen" class="h-full overflow-y-auto bg-gray-50 p-5">
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

        <!-- Signatures summary in fullscreen -->
        <div v-if="signatures.length > 0" class="mb-4 bg-white border border-gray-200 rounded-2xl p-3">
          <h4 class="text-sm font-medium text-gray-700 mb-2">{{ tr('Signature', 'Signatures') }} ({{ signatures.length }})</h4>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="sig in signatures"
              :key="sig.id"
              class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm border"
              :class="sig.page === currentPage ? 'border-blue-300 bg-blue-50' : 'border-gray-200'"
            >
              <img :src="sig.imageData" class="w-8 h-8 object-contain border rounded" />
              <span class="text-gray-600">{{ tr('Hal.', 'Pg.') }} {{ sig.page }}</span>
              <button @click="goToSignature(sig)" class="text-blue-500 hover:text-blue-700">
                <Icon name="mdi:eye" size="16" />
              </button>
              <button @click="removeSignature(sig.id)" class="text-red-500 hover:text-red-700">
                <Icon name="mdi:close" size="16" />
              </button>
            </div>
          </div>
        </div>

        <slot name="fullscreen-actions" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showDrawPanel" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" @click.self="showDrawPanel = false">
        <div class="bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-lg w-full">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold">{{ tr('Gambar Tanda Tangan', 'Draw Signature') }}</h3>
            <button @click="showDrawPanel = false" class="text-gray-500 hover:text-gray-700">
              <Icon name="mdi:close" size="24" />
            </button>
          </div>

          <SignaturePad ref="modalSignaturePadRef" :width="450" :height="180" @change="handleDrawnSignatureChange" />

          <div class="mt-4 flex gap-3 justify-end">
            <button @click="showDrawPanel = false" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
              {{ tr('Batal', 'Cancel') }}
            </button>
            <button
              @click="addDrawnSignature"
              :disabled="!drawnSignatureData"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="mdi:check" class="mr-1" />
              {{ tr('Taruh di PDF', 'Place on PDF') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import VuePdfEmbed from 'vue-pdf-embed'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min?url'
import { addSignatureToPdf, downloadPdf, type SignatureData } from '~/utils/pdf-signature'
const { tr } = useAppLocale()

GlobalWorkerOptions.workerSrc = workerSrc

interface PlacedSignature {
  id: string
  imageData: string
  x: number
  y: number
  width: number
  height: number
  page: number
}

const props = defineProps<{
  urlR2?: string
  maxHeight?: string
  fileName?: string
  defaultSignatureData?: string
}>()

const emit = defineEmits<{
  signatureChanged: [signatures: PlacedSignature[]]
  exported: [pdfBytes: Uint8Array]
}>()

const auth = useAuth()
auth.loadFromStorage()

const pdfSource = ref<string | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)
const pdfContainerRef = ref<HTMLElement | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const pageInput = ref(1)
const scale = ref(1.0)
const loading = ref(true)
const initialFitDone = ref(false)
const baseWidth = ref(0)
const baseHeight = ref(0)

const signatures = ref<PlacedSignature[]>([])
const selectedSignature = ref<string | null>(null)
const showDrawPanel = ref(false)
const drawnSignatureData = ref<string>('')
const defaultSignatureImageData = ref<string>('')
const exporting = ref(false)

const isFullscreen = ref(false)

const isDragging = ref(false)
const isResizing = ref(false)
const dragTarget = ref<PlacedSignature | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const resizeStart = ref({ x: 0, y: 0, w: 0, h: 0 })

const currentPageSignatures = computed(() => signatures.value.filter((s) => s.page === currentPage.value))

const editorContainerClass = computed(() => {
  if (!isFullscreen.value) return 'pdf-signature-editor'
  return 'pdf-signature-editor fixed inset-0 z-50 bg-white'
})

const contentStyle = computed(() => {
  if (isFullscreen.value) return {}
  return { maxHeight: props.maxHeight || '600px' }
})

onMounted(() => {
  loadPdf()
  loadDefaultSignature()
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('keydown', onKeyDown)
  document.body.style.overflow = ''
})

function loadPdf() {
  pdfSource.value = props.urlR2 || null
  loading.value = false
}

function onPdfLoaded(event: any) {
  totalPages.value = event._pdfInfo.numPages || 0
  currentPage.value = 1
  pageInput.value = 1
}

function onPdfRendered() {
  loading.value = false
  nextTick(() => {
    if (!pdfContainerRef.value) return

    const canvas = pdfContainerRef.value.querySelector('canvas')
    if (!canvas) return

    if (!initialFitDone.value) {
      baseWidth.value = canvas.clientWidth || canvas.width
      baseHeight.value = canvas.clientHeight || canvas.height
      initialFitDone.value = true
    }

    if (isFullscreen.value) fitFullscreenWidth()
  })
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  document.body.style.overflow = isFullscreen.value ? 'hidden' : ''
  if (isFullscreen.value) {
    nextTick(() => {
      fitFullscreenWidth()
    })
  }
}

function fitFullscreenWidth() {
  if (!isFullscreen.value || !scrollContainerRef.value || !baseWidth.value) return
  const availableWidth = scrollContainerRef.value.clientWidth - 32
  if (availableWidth <= 0) return
  const nextScale = Math.min(3, Math.max(0.5, availableWidth / baseWidth.value))
  if (Math.abs(nextScale - scale.value) > 0.02) {
    scale.value = nextScale
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    pageInput.value = currentPage.value
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    pageInput.value = currentPage.value
  }
}

function jumpToPage() {
  const target = Math.trunc(pageInput.value)
  if (target >= 1 && target <= totalPages.value) {
    currentPage.value = target
    pageInput.value = target
  }
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.1, 3.0)
  const canvas = pdfContainerRef.value?.querySelector('canvas')
  if (canvas) {
    canvas.style.width = (baseWidth.value * scale.value) + 'px'
    canvas.style.height = (baseHeight.value * scale.value) + 'px'
  }
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.1, 0.5)
  const canvas = pdfContainerRef.value?.querySelector('canvas')
  if (canvas) {
    canvas.style.width = (baseWidth.value * scale.value) + 'px'
    canvas.style.height = (baseHeight.value * scale.value) + 'px'
  }
}

watch(currentPage, (val) => {
  pageInput.value = val
})

function handleDrawnSignatureChange(dataUrl: string) {
  drawnSignatureData.value = dataUrl
}

function addDrawnSignature() {
  if (!drawnSignatureData.value) return
  addSignatureToPage(drawnSignatureData.value)
  showDrawPanel.value = false
  drawnSignatureData.value = ''
}

function useDefaultSignature() {
  if (!defaultSignatureImageData.value) return
  addSignatureToPage(defaultSignatureImageData.value)
}

function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    if (dataUrl) addSignatureToPage(dataUrl)
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function addSignatureToPage(imageData: string) {
  const sig: PlacedSignature = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    imageData,
    x: 50,
    y: 50,
    width: 200,
    height: 80,
    page: currentPage.value,
  }

  signatures.value.push(sig)
  selectedSignature.value = sig.id
  emit('signatureChanged', signatures.value)
}

function handleDropOnPdf(_event: DragEvent) {
}

function startDrag(event: MouseEvent, sig: PlacedSignature) {
  isDragging.value = true
  dragTarget.value = sig
  selectedSignature.value = sig.id

  const rect = pdfContainerRef.value?.getBoundingClientRect()
  if (rect) {
    dragOffset.value = {
      x: event.clientX - rect.left - sig.x,
      y: event.clientY - rect.top - sig.y,
    }
  }
}

function startResize(event: MouseEvent, sig: PlacedSignature) {
  isResizing.value = true
  dragTarget.value = sig
  selectedSignature.value = sig.id

  resizeStart.value = {
    x: event.clientX,
    y: event.clientY,
    w: sig.width,
    h: sig.height,
  }
}

function onMouseMove(event: MouseEvent) {
  if (!dragTarget.value || !pdfContainerRef.value) return

  const rect = pdfContainerRef.value.getBoundingClientRect()

  if (isDragging.value) {
    const newX = event.clientX - rect.left - dragOffset.value.x
    const newY = event.clientY - rect.top - dragOffset.value.y
    dragTarget.value.x = Math.max(0, Math.min(newX, rect.width - dragTarget.value.width))
    dragTarget.value.y = Math.max(0, Math.min(newY, rect.height - dragTarget.value.height))
  }

  if (isResizing.value) {
    const dx = event.clientX - resizeStart.value.x
    const dy = event.clientY - resizeStart.value.y

    const newWidth = Math.max(50, resizeStart.value.w + dx)
    const newHeight = Math.max(30, resizeStart.value.h + dy)

    dragTarget.value.width = Math.min(newWidth, rect.width - dragTarget.value.x)
    dragTarget.value.height = Math.min(newHeight, rect.height - dragTarget.value.y)
  }
}

function onMouseUp() {
  if (isDragging.value || isResizing.value) {
    isDragging.value = false
    isResizing.value = false
    dragTarget.value = null
    emit('signatureChanged', signatures.value)
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Delete' && selectedSignature.value) {
    removeSignature(selectedSignature.value)
  }
  if (event.key === 'Escape') {
    selectedSignature.value = null
    if (isFullscreen.value) toggleFullscreen()
  }
}

function removeSignature(id: string) {
  signatures.value = signatures.value.filter((s) => s.id !== id)
  if (selectedSignature.value === id) selectedSignature.value = null
  emit('signatureChanged', signatures.value)
}

function clearAllSignatures() {
  signatures.value = []
  selectedSignature.value = null
  emit('signatureChanged', signatures.value)
}

function goToSignature(sig: PlacedSignature) {
  currentPage.value = sig.page
  pageInput.value = sig.page
  selectedSignature.value = sig.id
}

async function exportSignedPdf() {
  if (signatures.value.length === 0 || !props.urlR2) return

  exporting.value = true
  try {
    const signedPdfBytes = await buildSignedPdfBytes()
    if (!signedPdfBytes) throw new Error(tr('Gagal menyiapkan PDF bertanda tangan', 'Failed to prepare signed PDF'))
    const filename = props.fileName || 'signed-document.pdf'
    downloadPdf(signedPdfBytes, filename)
    emit('exported', signedPdfBytes)
  } catch (err: any) {
    console.error('Export failed:', err)
  } finally {
    exporting.value = false
  }
}

async function buildSignedPdfBytes(): Promise<Uint8Array | null> {
  if (signatures.value.length === 0 || !props.urlR2) return null

  const response = await fetch(props.urlR2, {
    headers: auth.authHeaders(),
  })
  if (!response.ok) throw new Error(tr('Gagal mengambil PDF asli', 'Failed to fetch original PDF'))
  const arrayBuffer = await response.arrayBuffer()
  const pdfBytes = new Uint8Array(arrayBuffer)

  let renderedWidth = 612
  let renderedHeight = 792
  if (pdfContainerRef.value) {
    const canvas = pdfContainerRef.value.querySelector('canvas')
    if (canvas) {
      renderedWidth = canvas.clientWidth
      renderedHeight = canvas.clientHeight
    }
  }

  const { PDFDocument } = await import('pdf-lib')
  const tempDoc = await PDFDocument.load(pdfBytes)

  const signatureDataList: SignatureData[] = signatures.value.map((sig) => {
    const pageIndex = (sig.page || 1) - 1
    const pdfPage = tempDoc.getPages()[pageIndex]
    const pageSize = pdfPage ? pdfPage.getSize() : { width: 612, height: 792 }

    const scaleX = pageSize.width / renderedWidth
    const scaleY = pageSize.height / renderedHeight

    const pdfX = sig.x * scaleX
    const pdfY = pageSize.height - (sig.y + sig.height) * scaleY
    const pdfW = sig.width * scaleX
    const pdfH = sig.height * scaleY

    return {
      imageData: sig.imageData,
      x: pdfX,
      y: pdfY,
      width: pdfW,
      height: pdfH,
      page: sig.page,
    }
  })

  return await addSignatureToPdf(pdfBytes, signatureDataList)
}

function getSignatures() {
  return signatures.value
}

function getSignatureData(): string {
  return signatures.value.length > 0 ? signatures.value[0].imageData : ''
}

defineExpose({
  getSignatures,
  getSignatureData,
  exportSignedPdf,
  buildSignedPdfBytes,
  clearAllSignatures,
  useDefaultSignature,
})

watch(
  () => props.urlR2,
  () => {
    loading.value = true
    initialFitDone.value = false
    currentPage.value = 1
    pageInput.value = 1
    loadPdf()
  },
)

watch(
  () => props.defaultSignatureData,
  () => {
    loadDefaultSignature()
  },
)

async function loadDefaultSignature() {
  if (!props.defaultSignatureData) {
    defaultSignatureImageData.value = ''
    return
  }
  if (props.defaultSignatureData.startsWith('data:image/')) {
    defaultSignatureImageData.value = props.defaultSignatureData
    return
  }
  try {
    const blob = await $fetch<Blob>('/api/user/profile/signature', {
      headers: auth.authHeaders(),
      responseType: 'blob',
    })
    defaultSignatureImageData.value = await blobToDataUrl(blob)
  } catch {
    defaultSignatureImageData.value = ''
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
</script>

<style scoped>
.pdf-page-container {
  width: fit-content;
  margin: 0 auto;
}

.pdf-page-container :deep(canvas) {
  display: block;
  max-width: none !important;
  max-height: none !important;
}

.signature-overlay {
  transition: box-shadow 0.15s ease;
}

.signature-overlay:hover {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}
</style>
