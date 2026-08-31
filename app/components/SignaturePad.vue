<template>
  <div ref="wrapperRef" class="signature-pad-wrapper w-full">
    <div class="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
      <canvas
        ref="canvasRef"
        class="signature-canvas cursor-crosshair w-full"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
    </div>
    <div class="mt-3 flex gap-2">
      <button
        type="button"
        @click="clear"
        class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
      >
        <Icon name="mdi:eraser" class="mr-2" />
        {{ tr('Hapus', 'Clear') }}
      </button>
      <button
        type="button"
        @click="undo"
        class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        :disabled="!canUndo"
      >
        <Icon name="mdi:undo" class="mr-2" />
        {{ tr('Urungkan', 'Undo') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import SignaturePad from 'signature_pad'
const { tr } = useAppLocale()

const props = defineProps<{
  width?: number
  height?: number
  aspectRatio?: number
}>()

const emit = defineEmits<{
  change: [dataUrl: string]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)
const signaturePad = ref<SignaturePad | null>(null)
const canUndo = ref(false)

const canvasWidth = ref(props.width ?? 300)
const canvasHeight = ref(props.height ?? 180)

let resizeObserver: ResizeObserver | null = null

function resizeCanvas() {
  if (!wrapperRef.value || !canvasRef.value || !signaturePad.value) return

  // Save current signature data before resizing
  const data = signaturePad.value.toData()
  const isEmpty = signaturePad.value.isEmpty()

  const containerWidth = wrapperRef.value.clientWidth
  if (containerWidth === 0) return

  const ratio = props.aspectRatio ?? (props.height && props.width ? props.height / props.width : 180 / 330)
  canvasWidth.value = props.width ?? containerWidth
  // canvasHeight.value = props.height ?? Math.round(containerWidth * ratio)

  // Changing canvas dimensions clears it — restore data on next tick
  nextTick(() => {
    if (signaturePad.value) {
      signaturePad.value.clear()
      if (!isEmpty && data.length > 0) {
        signaturePad.value.fromData(data)
      }
    }
  })
}

onMounted(() => {
  if (canvasRef.value) {
    signaturePad.value = new SignaturePad(canvasRef.value, {
      backgroundColor: 'rgba(0, 0, 0, 0)',
      penColor: 'rgb(0, 0, 0)',
    })

    signaturePad.value.addEventListener('endStroke', () => {
      canUndo.value = true
      if (signaturePad.value) {
        const dataUrl = signaturePad.value.toDataURL('image/png')
        emit('change', dataUrl)
      }
    })
  }

  if (wrapperRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    resizeObserver.observe(wrapperRef.value)
    resizeCanvas()
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

const clear = () => {
  if (signaturePad.value) {
    signaturePad.value.clear()
    canUndo.value = false
    emit('change', '')
  }
}

const undo = () => {
  if (signaturePad.value) {
    const data = signaturePad.value.toData()
    if (data.length > 0) {
      data.pop()
      signaturePad.value.fromData(data)
      canUndo.value = data.length > 0
      
      if (data.length > 0) {
        const dataUrl = signaturePad.value.toDataURL('image/png')
        emit('change', dataUrl)
      } else {
        emit('change', '')
      }
    }
  }
}

const isEmpty = () => {
  return signaturePad.value?.isEmpty() ?? true
}

const toDataURL = (type = 'image/png') => {
  return signaturePad.value?.toDataURL(type) ?? ''
}

defineExpose({
  clear,
  undo,
  isEmpty,
  toDataURL,
})
</script>

<style scoped>
.signature-canvas {
  display: block;
  touch-action: none;
}
</style>
