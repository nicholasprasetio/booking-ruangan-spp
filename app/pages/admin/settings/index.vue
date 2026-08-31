<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4">
      <div class="max-w-3xl mx-auto">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">{{ tr('Pengaturan Umum', 'General Settings') }}</h1>
          <p class="text-gray-600 mt-1">{{ tr('Atur aturan umum peminjaman ruangan.', 'Manage general room booking rules.') }}</p>
        </div>

        <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-8">
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-5">
            {{ error }}
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-semibold text-gray-700">
              {{ tr('Minimal booking sebelumnya', 'Minimum booking lead time') }}
            </label>
            <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                v-model.number="bookingMinLeadDays"
                type="number"
                min="0"
                max="365"
                class="w-full sm:w-40 px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              <span class="text-sm text-gray-600">{{ tr('hari sebelum tanggal peminjaman', 'days before the booking date') }}</span>
            </div>
            <p class="text-xs text-gray-500">
              {{ tr('Nilai 0 berarti user bisa mengajukan untuk hari ini. Admin tetap bisa override aturan ini.', '0 allows users to request for today. Admins can still override this rule.') }}
            </p>
          </div>

          <div class="border-t border-gray-100 pt-6">
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h2 class="text-lg font-bold text-gray-900">{{ tr('Template Surat Peminjaman External', 'External Booking Letter Template') }}</h2>
                <p class="text-sm text-gray-600 mt-1">
                  {{ tr('Jika template tersedia, external wajib download, isi, lalu upload kembali saat mengajukan peminjaman.', 'When a template is available, external requesters must download, fill, and upload it back.') }}
                </p>
              </div>
              <a
                v-if="template?.available"
                href="/api/admin/settings/booking-letter-template/file"
                target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
              >
                <Icon name="mdi:download" />
                {{ tr('Download', 'Download') }}
              </a>
            </div>

            <div class="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div v-if="template?.available" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold text-gray-900 truncate">{{ template.file_name || 'template-surat-peminjaman.pdf' }}</div>
                  <div class="text-xs text-gray-500">
                    {{ template.file_size ? formatBytes(template.file_size) : '-' }}
                    <span v-if="template.updated_at"> - {{ formatDateTime(template.updated_at) }}</span>
                  </div>
                </div>
                <button
                  class="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition"
                  :disabled="templateBusy"
                  @click="deleteTemplate"
                >
                  {{ tr('Hapus Template', 'Delete Template') }}
                </button>
              </div>
              <div v-else class="text-sm text-gray-600">
                {{ tr('Belum ada template. Upload PDF untuk mulai mewajibkan surat pengajuan external.', 'No template yet. Upload a PDF to require external request letters.') }}
              </div>

              <div class="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  ref="templateInput"
                  type="file"
                  accept="application/pdf"
                  class="block w-full text-sm text-gray-700"
                  :disabled="templateBusy"
                  @change="onTemplateFileChange"
                />
                <button
                  class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
                  :disabled="templateBusy || !templateFile"
                  @click="uploadTemplate"
                >
                  {{ templateBusy ? tr('Memproses...', 'Processing...') : tr('Upload Template', 'Upload Template') }}
                </button>
              </div>
              <p v-if="templateFile" class="mt-2 text-xs text-gray-500">{{ templateFile.name }} - {{ formatBytes(templateFile.size) }}</p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
              :disabled="loading"
              @click="loadSettings"
            >
              {{ tr('Reset', 'Reset') }}
            </button>
            <button
              class="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-60"
              :disabled="saving"
              @click="saveSettings"
            >
              {{ saving ? tr('Menyimpan...', 'Saving...') : tr('Simpan', 'Save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Swal from 'sweetalert2'
import type { ExternalBookingLetterTemplate } from '~/models/external-booking'
import { deleteAdminBookingLetterTemplate, fetchGeneralSettings, updateGeneralSettings, uploadAdminBookingLetterTemplate } from '~/services/adminSettings'

const { tr, localeTag } = useAppLocale()
const auth = useAuth()
auth.loadFromStorage()

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const bookingMinLeadDays = ref(0)
const template = ref<ExternalBookingLetterTemplate | null>(null)
const templateFile = ref<File | null>(null)
const templateBusy = ref(false)
const templateInput = ref<HTMLInputElement | null>(null)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString(localeTag.value, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function loadSettings() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchGeneralSettings(auth.authHeaders())
    bookingMinLeadDays.value = Number(res.settings.booking_min_lead_days || 0)
    template.value = res.settings.external_booking_letter_template || null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || tr('Gagal memuat pengaturan.', 'Failed to load settings.')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  const days = Number(bookingMinLeadDays.value)
  if (!Number.isInteger(days) || days < 0 || days > 365) {
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Minimal booking harus 0-365 hari.', 'Minimum lead time must be 0-365 days.') })
    return
  }

  saving.value = true
  try {
    const res = await updateGeneralSettings({ booking_min_lead_days: days }, auth.authHeaders())
    bookingMinLeadDays.value = res.settings.booking_min_lead_days
    template.value = res.settings.external_booking_letter_template || template.value
    await Swal.fire({ icon: 'success', title: tr('Pengaturan disimpan', 'Settings saved'), timer: 1200, showConfirmButton: false })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menyimpan pengaturan.', 'Failed to save settings.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    saving.value = false
  }
}

function onTemplateFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (!file) {
    templateFile.value = null
    return
  }
  if (file.type !== 'application/pdf') {
    templateFile.value = null
    input.value = ''
    Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Template harus berupa PDF.', 'Template must be a PDF.') })
    return
  }
  if (file.size > 6 * 1024 * 1024) {
    templateFile.value = null
    input.value = ''
    Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: tr('Ukuran template maksimal 6 MB.', 'Template size is limited to 6 MB.') })
    return
  }
  templateFile.value = file
}

async function uploadTemplate() {
  if (!templateFile.value) return
  templateBusy.value = true
  try {
    const form = new FormData()
    form.append('template', templateFile.value)
    const res = await uploadAdminBookingLetterTemplate(form, auth.authHeaders())
    template.value = res.template
    templateFile.value = null
    if (templateInput.value) templateInput.value.value = ''
    await Swal.fire({ icon: 'success', title: tr('Template tersimpan', 'Template saved'), timer: 1200, showConfirmButton: false })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal upload template.', 'Failed to upload template.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    templateBusy.value = false
  }
}

async function deleteTemplate() {
  const confirm = await Swal.fire({
    icon: 'warning',
    title: tr('Hapus template?', 'Delete template?'),
    showCancelButton: true,
    confirmButtonText: tr('Hapus', 'Delete'),
    cancelButtonText: tr('Batal', 'Cancel'),
    confirmButtonColor: '#dc2626',
  })
  if (!confirm.isConfirmed) return

  templateBusy.value = true
  try {
    const res = await deleteAdminBookingLetterTemplate(auth.authHeaders())
    template.value = res.template
    await Swal.fire({ icon: 'success', title: tr('Template dihapus', 'Template deleted'), timer: 1200, showConfirmButton: false })
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || tr('Gagal menghapus template.', 'Failed to delete template.')
    await Swal.fire({ icon: 'error', title: tr('Gagal', 'Failed'), text: msg })
  } finally {
    templateBusy.value = false
  }
}

onMounted(loadSettings)
</script>
