<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="mx-auto max-w-5xl space-y-4">
    <div class="bg-white rounded-2xl shadow-xl border border-gray-100 w-full p-6">
      <div v-if="loading" class="text-center text-gray-600">Memverifikasi dokumen...</div>
      <div v-else-if="error" class="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">{{ error }}</div>
      <div v-else-if="data">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
          <Icon :name="data.valid ? 'mdi:check-decagram' : 'mdi:alert-circle'" class="text-4xl" :class="data.valid ? 'text-emerald-600' : 'text-red-600'" />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ data.valid ? 'Dokumen Valid' : 'Dokumen Belum Valid' }}</h1>
            <p class="text-gray-600">Hasil verifikasi token dokumen.</p>
          </div>
          </div>
          <a
            v-if="data.downloadUrl"
            :href="data.downloadUrl"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Icon name="mdi:file-download-outline" />
            Download PDF
          </a>
        </div>
        <dl class="mt-6 space-y-3 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-gray-500">Judul</dt><dd class="font-semibold text-right">{{ data.document.title }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-gray-500">File</dt><dd class="font-semibold text-right">{{ data.document.file_name }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-gray-500">Status</dt><dd class="font-semibold text-right">{{ data.document.status }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-gray-500">Revisi</dt><dd class="font-semibold text-right">{{ data.document.revision_number || 1 }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-gray-500">Disetujui</dt><dd class="font-semibold text-right">{{ formatDate(data.document.approved_at) }}</dd></div>
        </dl>
      </div>
    </div>
    <div v-if="data?.fileUrl" class="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-lg font-bold text-gray-900">Dokumen Final</h2>
        <a :href="data.fileUrl" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-indigo-700 hover:underline">
          Buka di tab baru
        </a>
      </div>
      <ClientOnly>
        <PdfViewer :url-r2="data.fileUrl" max-height="720px" />
      </ClientOnly>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<any | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await $fetch(`/api/public/document-verifications/${route.params.token}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Verifikasi tidak ditemukan.'
  } finally {
    loading.value = false
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

onMounted(load)
</script>
