<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4 max-w-2xl">
      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-5">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ tr('Scan QR Kunci', 'Scan Key QR') }}</h1>
          <p class="text-gray-600 mt-1">{{ tr('Arahkan kamera ke QR Code peminjaman untuk mencatat pengambilan atau pengembalian kunci.', 'Point the camera at the booking QR Code to record key pickup or return.') }}</p>
        </div>

        <div v-if="permissionState === 'prompt' || permissionState === 'idle'" class="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-center space-y-3">
          <Icon name="mdi:camera-outline" class="mx-auto text-indigo-600 w-12 h-12" />
          <div class="font-semibold text-indigo-900">{{ tr('Izinkan akses kamera', 'Allow camera access') }}</div>
          <p class="text-sm text-indigo-800">{{ tr('Aplikasi memerlukan kamera untuk membaca QR Code peminjaman.', 'The app needs the camera to read the booking QR Code.') }}</p>
          <button class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60" :disabled="requesting" @click="requestCameraPermission">
            <Icon v-if="requesting" name="mdi:loading" class="mr-2 animate-spin inline-block align-middle" />
            <Icon v-else name="mdi:camera-outline" class="mr-2 inline-block align-middle" />
            {{ requesting ? tr('Meminta akses...', 'Requesting...') : tr('Izinkan Kamera', 'Allow Camera') }}
          </button>
        </div>

        <div v-if="permissionState === 'denied'" class="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-2">
          <div class="flex items-center gap-2 font-semibold text-red-900">
            <Icon name="mdi:camera-off-outline" class="w-6 h-6" />
            {{ tr('Akses kamera ditolak', 'Camera access denied') }}
          </div>
          <p class="text-sm text-red-800">{{ tr('Buka pengaturan browser dan aktifkan izin kamera untuk situs ini, lalu muat ulang halaman.', 'Open your browser settings, enable camera permission for this site, then reload the page.') }}</p>
          <button class="mt-1 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700" @click="reloadPage">
            <Icon name="mdi:refresh" class="mr-1 inline-block align-middle" />
            {{ tr('Muat Ulang', 'Reload') }}
          </button>
        </div>

        <div v-if="permissionState === 'unavailable'" class="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-2">
          <div class="flex items-center gap-2 font-semibold text-amber-900">
            <Icon name="mdi:camera-off-outline" class="w-6 h-6" />
            {{ tr('Kamera tidak tersedia', 'Camera unavailable') }}
          </div>
          <p class="text-sm text-amber-800">{{ tr('Pastikan perangkat memiliki kamera dan halaman dibuka melalui HTTPS atau localhost.', 'Make sure this device has a camera and the page is opened through HTTPS or localhost.') }}</p>
        </div>

        <div v-show="permissionState === 'granted'" class="overflow-hidden rounded-2xl border border-gray-200 bg-slate-950">
          <div class="relative aspect-[4/3]">
            <video ref="videoRef" class="h-full w-full object-cover" muted playsinline autoplay />
            <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div class="h-52 w-52 rounded-3xl border-4 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
            </div>
            <div v-if="cameraStatus" class="absolute bottom-3 left-3 right-3 rounded-xl bg-black/65 px-3 py-2 text-sm font-semibold text-white">
              {{ cameraStatus }}
            </div>
          </div>
        </div>

        <button v-if="permissionState === 'granted'" class="w-full px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60" :disabled="loading" @click="restartCamera">
          <Icon v-if="loading" name="mdi:loading" class="mr-2 animate-spin inline-block align-middle" />
          <Icon v-else name="mdi:camera-refresh-outline" class="mr-2 inline-block align-middle" />
          {{ loading ? tr('Memproses...', 'Processing...') : tr('Scan Ulang', 'Scan Again') }}
        </button>

        <div v-if="result" class="rounded-2xl border p-4" :class="result.action === 'picked_up' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'">
          <div class="font-bold text-lg">{{ result.action === 'picked_up' ? tr('Kunci diambil', 'Key picked up') : tr('Kunci dikembalikan', 'Key returned') }}</div>
          <div class="mt-1">{{ result.room_name || '-' }} - {{ result.activity_name || tr('Peminjaman Ruangan', 'Room Booking') }}</div>
          <NuxtLink to="/security/keys" class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 sm:w-auto">
            <Icon name="mdi:view-dashboard-outline" class="inline-block align-middle" />
            {{ tr('Kembali ke Dashboard Satpam', 'Back to Security Dashboard') }}
          </NuxtLink>
        </div>

        <div v-if="error" class="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QrScanner from 'qr-scanner'
import { scanSecurityKey } from '~/services/securityKeys'

const auth = useAuth()
auth.loadFromStorage()
const route = useRoute()
const { tr } = useAppLocale()

const token = ref(String(route.query.token || ''))
const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<any | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const cameraStatus = ref('')
const requesting = ref(false)
const permissionState = ref<'idle' | 'prompt' | 'granted' | 'denied' | 'unavailable'>('idle')

let qrScanner: QrScanner | null = null
let scanLocked = false

async function submit() {
  if (!token.value || scanLocked) return
  scanLocked = true
  loading.value = true
  error.value = null
  result.value = null
  try {
    result.value = await scanSecurityKey(token.value, auth.authHeaders())
    cameraStatus.value = tr('QR berhasil diproses.', 'QR processed successfully.')
    qrScanner?.stop()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('QR tidak bisa diproses.', 'QR cannot be processed.')
    scanLocked = false
  } finally {
    loading.value = false
  }
}

function parseToken(rawValue: string) {
  const value = rawValue.trim()
  if (!value) return ''

  try {
    const url = new URL(value)
    return url.searchParams.get('token') || value
  } catch {
    return value
  }
}

async function checkPermissionState() {
  if (!import.meta.client) return

  if (!navigator.mediaDevices?.getUserMedia) {
    permissionState.value = 'unavailable'
    error.value = tr('Browser ini tidak mendukung akses kamera.', 'This browser does not support camera access.')
    return
  }

  try {
    const perm = await (navigator.permissions as any)?.query?.({ name: 'camera' as PermissionName })
    perm.onchange = () => {
      permissionState.value = perm.state === 'granted' ? 'granted' : perm.state === 'denied' ? 'denied' : 'prompt'
      if (permissionState.value === 'granted') startScanner()
    }
    if (perm?.state === 'granted') {
      permissionState.value = 'granted'
      await nextTick()
      await startScanner()
    } else if (perm?.state === 'denied') {
      permissionState.value = 'denied'
    } else {
      permissionState.value = 'prompt'
    }
  } catch {
    permissionState.value = 'prompt'
  }
}

async function requestCameraPermission() {
  if (!import.meta.client) return
  requesting.value = true
  error.value = null
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      permissionState.value = 'unavailable'
      error.value = tr('Browser ini tidak mendukung akses kamera.', 'This browser does not support camera access.')
      return
    }

    const hasCamera = await QrScanner.hasCamera()
    if (!hasCamera) {
      permissionState.value = 'unavailable'
      error.value = tr('Tidak ditemukan kamera pada perangkat ini.', 'No camera found on this device.')
      return
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
    stream.getTracks().forEach((t) => t.stop())
    permissionState.value = 'granted'
    await nextTick()
    await startScanner()
  } catch (e: any) {
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
      permissionState.value = 'denied'
      error.value = tr('Akses kamera ditolak oleh browser.', 'Camera access denied by the browser.')
    } else if (e?.name === 'NotFoundError') {
      permissionState.value = 'unavailable'
      error.value = tr('Tidak ditemukan kamera pada perangkat ini.', 'No camera found on this device.')
    } else {
      permissionState.value = 'prompt'
      error.value = e?.message || tr('Tidak bisa mengakses kamera.', 'Cannot access the camera.')
    }
  } finally {
    requesting.value = false
  }
}

async function startScanner() {
  if (!import.meta.client || !videoRef.value) return
  error.value = null
  cameraStatus.value = tr('Menyiapkan kamera...', 'Preparing camera...')

  try {
    stopScanner()
    qrScanner = new QrScanner(
      videoRef.value,
      (res) => {
        if (scanLocked) return
        token.value = parseToken(res.data)
        submit()
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 4,
        returnDetailedScanResult: true,
      },
    )
    await qrScanner.start()
    scanLocked = false
    cameraStatus.value = tr('Arahkan kamera ke QR Code.', 'Point the camera at the QR Code.')
  } catch (e: any) {
    cameraStatus.value = ''
    if (e?.name === 'NotAllowedError') {
      permissionState.value = 'denied'
      error.value = tr('Akses kamera ditolak.', 'Camera access denied.')
    } else if (e?.name === 'NotFoundError') {
      permissionState.value = 'unavailable'
      error.value = tr('Tidak ditemukan kamera pada perangkat ini.', 'No camera found on this device.')
    } else {
      error.value = e?.message || tr('Tidak bisa membuka kamera.', 'Cannot open the camera.')
    }
  }
}

function stopScanner() {
  qrScanner?.stop()
  qrScanner?.destroy()
  qrScanner = null
}

async function restartCamera() {
  token.value = ''
  result.value = null
  error.value = null
  scanLocked = false
  if (qrScanner) {
    try {
      await qrScanner.start()
      cameraStatus.value = tr('Arahkan kamera ke QR Code.', 'Point the camera at the QR Code.')
    } catch (e: any) {
      error.value = e?.message || tr('Tidak bisa memulai ulang kamera.', 'Cannot restart the camera.')
    }
  } else {
    await startScanner()
  }
}

function reloadPage() {
  if (import.meta.client) window.location.reload()
}

onMounted(async () => {
  if (token.value) submit()
  await checkPermissionState()
})

onBeforeUnmount(() => {
  stopScanner()
})
</script>
