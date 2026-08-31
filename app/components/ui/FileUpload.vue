<template>
  <div>
    <!-- Custom trigger slot (e.g. a button). Exposes `open` to programmatically open file picker. -->
    <slot name="trigger" :open="openFilePicker" :uploading="isUploading" />

    <!-- Default drag-drop zone (shown when no trigger slot is provided) -->
    <div
      v-if="!$slots.trigger"
      class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition"
      :class="[
        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ]"
      @click="openFilePicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <Icon name="mdi:cloud-upload-outline" size="36" class="text-gray-400 mx-auto mb-2" />
      <p class="text-sm font-medium text-gray-600">
        {{ tr('Klik atau seret file ke sini', 'Click or drag files here') }}
      </p>
      <p class="text-xs text-gray-400 mt-1">{{ accept }} &middot; maks {{ formatBytes(maxSizeBytes) }}</p>
    </div>

    <!-- Hidden file input -->
    <input
      ref="inputRef"
      type="file"
      :accept="accept"
      :multiple="multiple"
      class="hidden"
      @change="onFileChange"
    />

    <!-- Upload progress list -->
    <div v-if="showProgress && items.length" class="mt-3 space-y-2">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-3 bg-gray-50 rounded-xl p-2 text-sm"
      >
        <img
          v-if="item.previewUrl"
          :src="item.previewUrl"
          class="w-10 h-10 rounded-lg object-cover shrink-0"
        />
        <div class="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0" v-else>
          <Icon name="mdi:file-image-outline" size="20" class="text-gray-400" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-gray-700 truncate">{{ item.file.name }}</p>
          <p class="text-xs text-gray-400">{{ formatBytes(item.file.size) }}</p>
          <p v-if="item.error" class="text-xs text-red-500 mt-0.5">{{ item.error }}</p>
        </div>

        <div class="shrink-0">
          <Icon v-if="item.status === 'uploading'" name="mdi:loading" class="animate-spin text-sky-500" size="20" />
          <Icon v-else-if="item.status === 'done'" name="mdi:check-circle" class="text-emerald-500" size="20" />
          <Icon v-else-if="item.status === 'error'" name="mdi:alert-circle" class="text-red-500" size="20" />
        </div>

        <button
          v-if="item.status !== 'uploading'"
          class="text-gray-300 hover:text-red-500 transition shrink-0"
          type="button"
          @click.stop="removeItem(item.id)"
        >
          <Icon name="mdi:close" size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** MIME types accepted, e.g. "image/*" */
  accept?: string
  /** Allow selecting multiple files */
  multiple?: boolean
  /** Max file size in bytes (default 6 MB) */
  maxSizeBytes?: number
  /** Auth headers forwarded to the presign endpoint */
  headers: Record<string, string>
  /** Extra body fields merged into the presign request (e.g. { prefix: 'rooms' }) */
  presignPayload?: Record<string, unknown>
  /** Direct multipart upload endpoint. Skips the R2 presign flow when set. */
  localUploadUrl?: string
  /** Show the upload progress list below the drop zone */
  showProgress?: boolean
  /** Disable interaction */
  disabled?: boolean
}>(), {
  accept: 'image/*',
  multiple: false,
  maxSizeBytes: 6 * 1024 * 1024,
  presignPayload: () => ({}),
  localUploadUrl: '',
  showProgress: true,
  disabled: false,
})

const emit = defineEmits<{
  /** Emitted once per successfully uploaded file */
  uploaded: [file: UploadedFile]
  /** Emitted when any file fails */
  uploadError: [message: string]
}>()

defineExpose({ openFilePicker })

// ── Types ────────────────────────────────────────────────────────────────────

export interface UploadedFile {
  objectKey: string
  contentType: string
  byteSize: number
  /** Blob URL created from the original File — display immediately without re-fetching */
  previewUrl: string
  file: File
  /** Database photo returned by the local room-photo upload endpoint */
  photo?: {
    id: number
    url: string
    created_at: string
  }
}

interface UploadItem {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

// ── State ────────────────────────────────────────────────────────────────────

const { tr } = useAppLocale()
const inputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const items = ref<UploadItem[]>([])
const isUploading = computed(() => items.value.some(i => i.status === 'uploading'))

// ── Public API ───────────────────────────────────────────────────────────────

function openFilePicker() {
  if (!props.disabled) inputRef.value?.click()
}

// ── Handlers ─────────────────────────────────────────────────────────────────

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  handleFiles(files)
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  handleFiles(files)
}

function handleFiles(files: File[]) {
  for (const file of files) {
    const validationError = validateFile(file)
    if (validationError) {
      emit('uploadError', validationError)
      continue
    }
    const item: UploadItem = {
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }
    items.value = [...items.value, item]
    uploadFile(item)
  }
}

function validateFile(file: File): string | null {
  if (file.size > props.maxSizeBytes) {
    return `${file.name}: ${tr('Ukuran file terlalu besar', 'File too large')} (maks ${formatBytes(props.maxSizeBytes)})`
  }
  if (props.accept !== '*' && props.accept !== '*/*') {
    const accepted = props.accept.split(',').map(a => a.trim())
    const matchesAny = accepted.some(pattern => {
      if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1))
      return file.type === pattern || file.name.endsWith(pattern.replace('*.', '.'))
    })
    if (!matchesAny) {
      return `${file.name}: ${tr('Tipe file tidak didukung', 'File type not supported')}`
    }
  }
  return null
}

async function uploadFile(item: UploadItem) {
  updateItem(item.id, { status: 'uploading' })

  try {
    // Local multipart upload mode (used by room photos).
    if (props.localUploadUrl) {
      const formData = new FormData()
      formData.append('files', item.file)

      const localRes = await $fetch<{
        ok: boolean
        photos?: Array<{
          id: number
          url: string
          created_at: string
        }>
      }>(props.localUploadUrl, {
        method: 'POST',
        headers: props.headers,
        body: formData,
      })

      const photo = localRes.photos?.[0]

      if (!photo) {
        throw new Error('Upload berhasil tetapi response foto tidak ditemukan')
      }

      updateItem(item.id, { status: 'done' })

      emit('uploaded', {
        objectKey: photo.url,
        contentType: item.file.type,
        byteSize: item.file.size,
        previewUrl: item.previewUrl,
        file: item.file,
        photo,
      })

      return
    }

    // Existing R2 presigned upload flow.
    const presignRes = await $fetch<{ presignedUrl: string; objectKey: string }>(
      '/api/upload/presign',
      {
        method: 'POST',
        headers: props.headers,
        body: { contentType: item.file.type, ...props.presignPayload },
      },
    )

    const putRes = await fetch(presignRes.presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': item.file.type },
      body: item.file,
    })

    if (!putRes.ok) {
      throw new Error(`R2 upload failed: ${putRes.status} ${putRes.statusText}`)
    }

    updateItem(item.id, { status: 'done' })

    emit('uploaded', {
      objectKey: presignRes.objectKey,
      contentType: item.file.type,
      byteSize: item.file.size,
      previewUrl: item.previewUrl,
      file: item.file,
    })
  } catch (e: unknown) {
    const msg = (e as Error)?.message || tr('Upload gagal', 'Upload failed')
    updateItem(item.id, { status: 'error', error: msg })
    emit('uploadError', `${item.file.name}: ${msg}`)
  }
}

function updateItem(id: string, patch: Partial<UploadItem>) {
  items.value = items.value.map(i => (i.id === id ? { ...i, ...patch } : i))
}

function removeItem(id: string) {
  const item = items.value.find(i => i.id === id)
  if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
  items.value = items.value.filter(i => i.id !== id)
}

// ── Utils ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>
